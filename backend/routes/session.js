const express = require('express');
const router = express.Router();
const supabase = require('../config/supabase');

// GET /api/session/:sessionId
router.get('/:sessionId', async (req, res, next) => {
  try {
    const { sessionId } = req.params;

    if (!sessionId || typeof sessionId !== 'string') {
      return res.status(400).json({ error: 'Missing or invalid sessionId parameter' });
    }

    // 1. Query the main sessions table
    const { data: sessionData, error: sessionError } = await supabase
      .from('sessions')
      .select('topic, expert_graph')
      .eq('id', sessionId)
      .single();

    if (sessionError || !sessionData) {
      console.warn(`Session ${sessionId} not found in database:`, sessionError?.message);
      return res.status(404).json({ error: 'Session not found' });
    }

    // 2. Query the conversations table (may be empty if Socratic chat hasn't started)
    // Note: use .maybeSingle() or handle RLS/not-found error gracefully
    // Wait, in Supabase JS v2, querying .single() on a non-existent row yields an error with code PGRST116.
    // If it hasn't started, convError will be returned. We should safely handle convError PGRST116.
    const { data: convData, error: convError } = await supabase
      .from('conversations')
      .select('messages, user_model')
      .eq('session_id', sessionId)
      .maybeSingle();

    if (convError) {
      console.error(`Error fetching conversation for session ${sessionId}:`, convError.message);
    }

    // 3. Query the results table (only exists if user finished conversation)
    const { data: resultsData, error: resultsError } = await supabase
      .from('results')
      .select('ranked_gaps, questions, calibration_score, blind_spot_score')
      .eq('session_id', sessionId)
      .maybeSingle();

    if (resultsError) {
      console.error(`Error fetching results for session ${sessionId}:`, resultsError.message);
    }

    // 4. Return the assembled payload
    return res.status(200).json({
      sessionId,
      topic: sessionData.topic,
      expertGraph: sessionData.expert_graph,
      chatHistory: convData ? convData.messages : [],
      userModel: convData ? convData.user_model : [],
      rankedGaps: resultsData ? resultsData.ranked_gaps : null,
      questions: resultsData ? resultsData.questions : null,
      calibrationScore: resultsData ? resultsData.calibration_score : null,
      blindSpotScore: resultsData ? resultsData.blind_spot_score : null
    });

  } catch (error) {
    error.clientMessage = 'Internal server error while fetching session';
    next(error);
  }
});

module.exports = router;
