const express = require('express');
const router = express.Router();
const groq = require('../config/groq');
const supabase = require('../config/supabase');
const { recordAgentEvent, normalizeError } = require('../utils/agentTrace');
const { generateFallbackSocratic } = require('../utils/fallbacks');

router.post('/', async (req, res, next) => {
  try {
    const { sessionId } = req.body;

    // Step 1 - Setup: Validate request body
    if (!sessionId) {
      return res.status(400).json({ error: 'sessionId is required' });
    }

    recordAgentEvent('agent4', 'request_received', {
      sessionId
    });

    // Step 2 - Fetch ranked gaps from Supabase
    const { data: resultsRows, error: resultsError } = await supabase
      .from('results')
      .select('ranked_gaps')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: false })
      .limit(1);

    if (resultsError || !resultsRows || resultsRows.length === 0) {
      console.error('Fetch results failed or empty:', resultsError);
      return res.status(404).json({
        error: 'Failed to retrieve ranked gaps from database',
        details: resultsError ? resultsError.message : 'No ranked gaps found for this session. Please run Gap Ranker (Agent 3) first.'
      });
    }

    const rankedGaps = resultsRows[0].ranked_gaps || [];
    
    // Take only the first 5 items from ranked_gaps array
    const topGaps = rankedGaps.slice(0, 5);

    // Log the top 5 gaps with console.log
    console.log('Top 5 Gaps fetched:', JSON.stringify(topGaps, null, 2));
    recordAgentEvent('agent4', 'top_gaps_loaded', {
      sessionId,
      topGaps
    });

    // Step 3 - Send to Groq with this exact prompt
    const prompt = `You are a master Socratic teacher for a learning app.
A student has these knowledge gaps, ranked by importance:

Top 5 Gaps: ${JSON.stringify(topGaps)}

Your job has two parts:

PART 1 - For each gap, write ONE Socratic question that:
- Makes the learner feel the gap themselves without 
  being told they have it
- Is phrased in plain everyday language, no jargon
- Cannot be answered with yes or no
- Does NOT explain the concept or hint at the answer
- Is under 25 words
- Makes the reader think: I never thought about that

PART 2 - Write a learning path:
- Order the concepts so each one naturally unlocks the next
- Show what each concept unlocks when learned

CRITICAL LANGUAGE CONSTRAINT: All output strings (specifically the Socratic "question", "why_this_matters", and learning path details) MUST be written exclusively in English. Translate any non-English terms internally if necessary.

Respond ONLY in this exact JSON format.
No markdown. No backticks. No explanation. JSON only:
{
  "questions": [
    {
      "order": number,
      "concept": string,
      "label": string,
      "question": string,
      "why_this_matters": one sentence max
    }
  ],
  "learning_path": [
    {
      "order": number,
      "concept": string,
      "label": string,
      "unlocks": array of concept label strings
    }
  ]
}`;

    let parsed;
    try {
      recordAgentEvent('agent4', 'groq_request', {
        provider: 'groq',
        model: 'llama-3.3-70b-versatile',
        sessionId,
        topGapsCount: topGaps.length
      });

      const chatCompletion = await groq.chat.completions.create({
        model: "llama-3.3-70b-versatile",
        response_format: { type: "json_object" },
        messages: [{ role: "user", content: prompt }],
        max_tokens: 500
      });
      let rawText = chatCompletion.choices[0].message.content.trim();

      // Clean response by stripping markdown backticks
      if (rawText.startsWith('```')) {
        rawText = rawText.replace(/^```json\s*/i, '').replace(/```$/, '').trim();
      }

      const tempParsed = JSON.parse(rawText);
      if (!tempParsed.questions || !tempParsed.learning_path) {
        throw new Error('Groq response missing questions or learning_path field.');
      }
      parsed = tempParsed;
      recordAgentEvent('agent4', 'groq_response_parsed', {
        sessionId,
        rawResponse: rawText,
        parsed
      });
    } catch (apiError) {
      console.warn('Groq API call failed. Falling back to dynamic mock Socratic generation. Error:', apiError.message);
      parsed = generateFallbackSocratic(topGaps);
      recordAgentEvent('agent4', 'fallback_used', {
        sessionId,
        reason: normalizeError(apiError),
        parsed
      });
    }

    // Step 4 - Parse, save and return
    // Update the existing row in Supabase results table where session_id = sessionId
    // Add questions and learning_path fields to the row
    // We will attempt to save both, but fall back if learning_path is not a column in the database
    let updateError;
    let updateData;

    try {
      const result = await supabase
        .from('results')
        .update({
          questions: parsed.questions,
          learning_path: parsed.learning_path
        })
        .eq('session_id', sessionId)
        .select();
      
      updateError = result.error;
      updateData = result.data;
    } catch (dbError) {
      console.warn('Initial update attempt crashed, likely due to schema mismatch:', dbError);
      updateError = dbError;
    }

    // Check if we hit a column not found error for learning_path, and fall back to saving questions only
    const isColumnError = updateError && (
      (updateError.message && updateError.message.includes('learning_path')) ||
      (updateError.code && updateError.code === 'PGRST204')
    );

    if (isColumnError) {
      console.log('Column learning_path does not exist in database results table. Falling back to updating questions column only.');
      const fallbackResult = await supabase
        .from('results')
        .update({
          questions: parsed.questions
        })
        .eq('session_id', sessionId)
        .select();

      updateError = fallbackResult.error;
      updateData = fallbackResult.data;
    }

    if (updateError) {
      console.error('Supabase update results error:', updateError);
      return res.status(500).json({
        error: 'Failed to update results in database',
        details: updateError.message || String(updateError)
      });
    }

    // Return JSON response
    recordAgentEvent('agent4', 'results_saved', {
      sessionId,
      questions: parsed.questions,
      learningPath: parsed.learning_path
    });

    return res.status(200).json({
      questions: parsed.questions,
      learningPath: parsed.learning_path
    });

  } catch (error) {
    error.clientMessage = 'Internal server error in Socratic Output';
    next(error);
  }
});

module.exports = router;
