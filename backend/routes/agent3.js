const express = require('express');
const router = express.Router();
const groq = require('../config/groq');
const supabase = require('../config/supabase');
const { recordAgentEvent, normalizeError } = require('../utils/agentTrace');
const { generateFallbackRankedGaps } = require('../utils/fallbacks');

router.post('/', async (req, res, next) => {
  try {
    const { sessionId } = req.body;

    // Step 1 - Setup: Validate request body
    if (!sessionId) {
      return res.status(400).json({ error: 'sessionId is required' });
    }

    recordAgentEvent('agent3', 'request_received', {
      sessionId
    });

    // Step 2 - Fetch data from Supabase
    const { data: sessionData, error: sessionError } = await supabase
      .from('sessions')
      .select('expert_graph')
      .eq('id', sessionId)
      .maybeSingle();

    if (sessionError || !sessionData) {
      console.error('Fetch sessions failed or empty:', sessionError);
      return res.status(404).json({
        error: 'Failed to retrieve session from database',
        details: sessionError ? sessionError.message : 'Session not found'
      });
    }

    const expertGraph = sessionData.expert_graph || { nodes: [], edges: [] };

    const { data: convRows, error: convError } = await supabase
      .from('conversations')
      .select('user_model')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: false })
      .limit(1);

    if (convError || !convRows || convRows.length === 0) {
      console.error('Fetch conversations failed or empty:', convError);
      return res.status(404).json({
        error: 'Failed to retrieve conversation from database',
        details: convError ? convError.message : 'Conversation not found'
      });
    }

    const userModel = convRows[0].user_model || [];

    // Log both fetched objects with console.log for debugging
    console.log('Fetched expertGraph:', JSON.stringify(expertGraph, null, 2));
    console.log('Fetched userModel:', JSON.stringify(userModel, null, 2));

    // Step 3 - Build gap list in JavaScript (no AI needed here)
    const gaps = [];
    const nodes = expertGraph.nodes || [];
    const edges = expertGraph.edges || [];

    for (const node of nodes) {
      const userConcept = userModel.find(item => item.id === node.id);
      const confidence = userConcept ? userConcept.confidence : null;

      // If confidence is below 0.5 OR the concept was never found in user_model, mark it as a gap
      if (confidence === null || confidence < 0.5) {
        // Count how many edges in expert_graph.edges have this node id as the "from" value
        const unlockValue = edges.filter(edge => edge.from === node.id).length;

        gaps.push({
          id: node.id,
          label: node.label,
          description: node.description || '',
          confidence: confidence,
          unlock_value: unlockValue
        });
      }
    }

    // Log the gaps array with console.log
    console.log('Built gaps list:', JSON.stringify(gaps, null, 2));
    recordAgentEvent('agent3', 'gaps_built', {
      sessionId,
      gaps,
      expertGraphNodesCount: nodes.length,
      userModel
    });

    // Step 4 - Send gaps to Groq for ranking
    const gapIds = new Set(gaps.map(g => g.id));
    const cleanNodes = (expertGraph.nodes || []).map(n => ({
      id: n.id,
      label: n.label,
      unlock_score: n.unlock_score
    }));
    const filteredEdges = (expertGraph.edges || []).filter(edge => gapIds.has(edge.from) || gapIds.has(edge.to));
    const optimizedGraph = {
      nodes: cleanNodes,
      edges: filteredEdges
    };
    const cleanGaps = gaps.map(g => ({
      id: g.id,
      label: g.label,
      confidence: g.confidence,
      unlock_value: g.unlock_value
    }));

    const openingExplanation = expertGraph.opening_explanation || '';

    const prompt = `You are a knowledge gap analyst for a learning app.
A student has just completed a diagnostic conversation.
Based on their performance, here are their knowledge gaps:

Gaps: ${JSON.stringify(cleanGaps)}
Optimized expert graph for context: ${JSON.stringify(optimizedGraph)}
User's initial self-assessment explanation: "${openingExplanation}"

Your job:
1. Evaluate the user's initial self-assessment explanation and assess their implied confidence level (Pre-seed confidence) on a scale from 0.0 (no confidence/beginner) to 1.0 (absolute confidence/expert).
2. Rank these gaps from most critical to least critical.
Consider:
- How many downstream concepts this gap blocks
- How fundamental this concept is to the topic
- How far the student is from understanding it

CRITICAL LANGUAGE CONSTRAINT: All output strings (such as the "why" reason explaining why this gap matters) MUST be written exclusively in English. Translate any non-English terms internally if necessary.

Respond ONLY in this exact JSON format. 
No markdown. No backticks. No explanation. JSON only:
{
  "expected_confidence": number between 0.0 and 1.0,
  "ranked_gaps": [
    {
      "concept": string,
      "label": string,
      "priority": number between 1 and 10,
      "why": one sentence explaining why this gap matters,
      "downstream": array of concept ids this unlocks
    }
  ]
}`;

    let rankedGaps;
    let expectedConfidence = 0.5;

    try {
      recordAgentEvent('agent3', 'groq_request', {
        provider: 'groq',
        model: 'llama-3.1-8b-instant',
        sessionId,
        gapsCount: gaps.length
      });

      const chatCompletion = await groq.chat.completions.create({
        model: "llama-3.1-8b-instant",
        response_format: { type: "json_object" },
        messages: [{ role: "user", content: prompt }]
      });
      let rawText = chatCompletion.choices[0].message.content.trim();

      // Clean response by stripping markdown backticks
      if (rawText.startsWith('```')) {
        rawText = rawText.replace(/^```json\s*/i, '').replace(/```$/, '').trim();
      }

      const parsedResult = JSON.parse(rawText);
      if (!parsedResult.ranked_gaps || !Array.isArray(parsedResult.ranked_gaps)) {
        throw new Error('Groq response missing ranked_gaps field or it is not an array.');
      }
      rankedGaps = parsedResult.ranked_gaps;
      if (parsedResult.expected_confidence !== undefined) {
        expectedConfidence = parseFloat(parsedResult.expected_confidence);
      }
      recordAgentEvent('agent3', 'groq_response_parsed', {
        sessionId,
        rawResponse: rawText,
        rankedGaps
      });
    } catch (apiError) {
      console.warn('Groq API call failed. Falling back to dynamic JS gap ranking. Error:', apiError.message);
      rankedGaps = generateFallbackRankedGaps(gaps, expertGraph);
      recordAgentEvent('agent3', 'fallback_used', {
        sessionId,
        reason: normalizeError(apiError),
        rankedGaps
      });
    }

    // Step 5 - Compute Scores and Save
    const { computeBlindSpotScore } = require('../utils/blindSpotScore');
    const totalConcepts = (expertGraph.nodes || []).length;
    const blindSpotScore = computeBlindSpotScore(rankedGaps, totalConcepts);

    const validModel = userModel.filter(item => item && typeof item.confidence === 'number');
    const finalActualConfidence = validModel.length > 0
      ? validModel.reduce((sum, item) => sum + item.confidence, 0) / validModel.length
      : 0.0;

    const diff = expectedConfidence - finalActualConfidence;
    let calibrationClass = 'Well-calibrated';
    if (diff > 0.3) {
      calibrationClass = 'Overconfident (Dunning-Kruger)';
    } else if (diff < -0.3) {
      calibrationClass = 'Underconfident (Imposter Syndrome)';
    }

    // Check if results already exist for this session
    const { data: existingResults, error: checkError } = await supabase
      .from('results')
      .select('id')
      .eq('session_id', sessionId);

    let saveError = null;
    if (existingResults && existingResults.length > 0) {
      // Update existing
      const { error: updateError } = await supabase
        .from('results')
        .update({
          ranked_gaps: rankedGaps,
          calibration_score: calibrationClass,
          blind_spot_score: blindSpotScore
        })
        .eq('session_id', sessionId);
      saveError = updateError;
    } else {
      // Insert new
      const { error: insertError } = await supabase
        .from('results')
        .insert([
          {
            session_id: sessionId,
            ranked_gaps: rankedGaps,
            calibration_score: calibrationClass,
            blind_spot_score: blindSpotScore
          }
        ]);
      saveError = insertError;
    }

    if (saveError) {
      console.error('Supabase save results error:', saveError);
      return res.status(500).json({
        error: 'Failed to save results to database',
        details: saveError.message
      });
    }

    // Return JSON response
    recordAgentEvent('agent3', 'results_saved', {
      sessionId,
      rankedGaps,
      calibrationScore: calibrationClass,
      blindSpotScore: blindSpotScore
    });

    return res.status(200).json({
      rankedGaps: rankedGaps,
      calibrationScore: calibrationClass,
      blindSpotScore: blindSpotScore
    });

  } catch (error) {
    error.clientMessage = 'Internal server error in Gap Ranker';
    next(error);
  }
});

module.exports = router;
