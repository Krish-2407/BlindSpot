const express = require('express');
const router = express.Router();
const groq = require('../config/groq');
const supabase = require('../config/supabase');
const { recordAgentEvent, normalizeError } = require('../utils/agentTrace');

function generateFallbackRankedGaps(gaps, expertGraph) {
  // Sort gaps by unlock_value descending, then confidence ascending
  const sortedGaps = [...gaps].sort((a, b) => {
    if (b.unlock_value !== a.unlock_value) {
      return b.unlock_value - a.unlock_value;
    }
    const confA = a.confidence === null ? 0 : a.confidence;
    const confB = b.confidence === null ? 0 : b.confidence;
    return confA - confB;
  });

  return sortedGaps.map((gap, index) => {
    const confVal = gap.confidence === null ? 0 : gap.confidence;
    // Calculate priority between 1 and 10
    const priority = Math.min(10, Math.max(1, parseFloat((8.0 + (gap.unlock_value * 0.5) - (confVal * 3) - (index * 0.5)).toFixed(1))));
    
    // Find downstream concept ids
    const downstream = (expertGraph.edges || [])
      .filter(edge => edge.from === gap.id)
      .map(edge => edge.to);

    return {
      concept: gap.id,
      label: gap.label,
      priority: priority,
      why: `This concept is essential to unlock ${downstream.length > 0 ? downstream.join(', ') : 'more advanced topics'} and requires further practice.`,
      downstream: downstream
    };
  });
}

router.post('/', async (req, res) => {
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

    // Step 4 - Send gaps to Gemini for ranking
    const prompt = `You are a knowledge gap analyst for a learning app.
A student has just completed a diagnostic conversation.
Based on their performance, here are their knowledge gaps:

Gaps: ${JSON.stringify(gaps)}
Full expert graph for context: ${JSON.stringify(expertGraph)}

Your job: Rank these gaps from most critical to least critical.
Consider:
- How many downstream concepts this gap blocks
- How fundamental this concept is to the topic
- How far the student is from understanding it

CRITICAL LANGUAGE CONSTRAINT: All output strings (such as the "why" reason explaining why this gap matters) MUST be written exclusively in English. Translate any non-English terms internally if necessary.

Respond ONLY in this exact JSON format. 
No markdown. No backticks. No explanation. JSON only:
{
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
    try {
      recordAgentEvent('agent3', 'groq_request', {
        provider: 'groq',
        model: 'llama-3.3-70b-versatile',
        sessionId,
        gapsCount: gaps.length
      });

      const chatCompletion = await groq.chat.completions.create({
        model: "llama-3.3-70b-versatile",
        response_format: { type: "json_object" },
        messages: [{ role: "user", content: prompt }]
      });
      let geminiText = chatCompletion.choices[0].message.content.trim();

      // Clean response by stripping markdown backticks
      if (geminiText.startsWith('```')) {
        geminiText = geminiText.replace(/^```json\s*/i, '').replace(/```$/, '').trim();
      }

      const parsedResult = JSON.parse(geminiText);
      if (!parsedResult.ranked_gaps || !Array.isArray(parsedResult.ranked_gaps)) {
        throw new Error('Groq response missing ranked_gaps field or it is not an array.');
      }
      rankedGaps = parsedResult.ranked_gaps;
      recordAgentEvent('agent3', 'groq_response_parsed', {
        sessionId,
        rawResponse: geminiText,
        rankedGaps
      });
    } catch (apiError) {
      console.warn('Groq API call failed. Falling back to dynamic JS gap ranking. Error:', apiError.message || apiError);
      rankedGaps = generateFallbackRankedGaps(gaps, expertGraph);
      recordAgentEvent('agent3', 'fallback_used', {
        sessionId,
        reason: normalizeError(apiError),
        rankedGaps
      });
    }

    // Step 5 - Parse and save
    // Insert a new row into Supabase results table
    const { data: insertData, error: insertError } = await supabase
      .from('results')
      .insert([
        {
          session_id: sessionId,
          ranked_gaps: rankedGaps
        }
      ])
      .select();

    if (insertError) {
      console.error('Supabase insert results error:', insertError);
      return res.status(500).json({
        error: 'Failed to save results to database',
        details: insertError.message
      });
    }

    // Return JSON response
    recordAgentEvent('agent3', 'results_saved', {
      sessionId,
      rankedGaps
    });

    return res.status(200).json({
      rankedGaps: rankedGaps
    });

  } catch (error) {
    // Log all errors with console.error showing the full error
    console.error('Unexpected error in Agent 3 (Gap Ranker) endpoint:', error);
    return res.status(500).json({
      error: 'Internal server error in Gap Ranker',
      message: error.message
    });
  }
});

module.exports = router;
