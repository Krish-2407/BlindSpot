const express = require('express');
const router = express.Router();
const supabase = require('../config/supabase');
const geminiModel = require('../config/gemini');

router.post('/', async (req, res) => {
  try {
    const { sessionId, messages, userMessage } = req.body;

    // 1. Validate request body fields
    if (!sessionId || typeof sessionId !== 'string') {
      return res.status(400).json({ error: 'Missing or invalid required field: sessionId' });
    }
    if (!userMessage || typeof userMessage !== 'string' || !userMessage.trim()) {
      return res.status(400).json({ error: 'Missing or invalid required field: userMessage' });
    }

    // 2. Fetch session and expert graph
    const { data: sessionData, error: sessionError } = await supabase
      .from('sessions')
      .select('*')
      .eq('id', sessionId)
      .maybeSingle();

    if (sessionError) {
      console.error('Supabase fetch session error:', sessionError);
      return res.status(500).json({ error: 'Failed to retrieve session from database', details: sessionError.message });
    }

    if (!sessionData) {
      return res.status(404).json({ error: 'Session not found' });
    }

    const expertGraph = sessionData.expert_graph || { nodes: [], edges: [] };
    const conceptsList = (expertGraph.nodes || []).map(node => ({
      id: node.id,
      label: node.label,
      description: node.description
    }));

    // 3. Fetch existing conversation
    const { data: convData, error: convError } = await supabase
      .from('conversations')
      .select('*')
      .eq('session_id', sessionId)
      .maybeSingle();

    if (convError) {
      console.error('Supabase fetch conversation error:', convError);
      return res.status(500).json({ error: 'Failed to retrieve conversation from database', details: convError.message });
    }

    let history = [];
    let userModel = [];

    if (convData) {
      history = convData.messages || [];
      userModel = convData.user_model || [];
    } else {
      // Initialize with messages from request body (if any) or empty array
      history = Array.isArray(messages) ? [...messages] : [];
      // Initialize user model with all concepts set to confidence 0.0
      userModel = conceptsList.map(c => ({
        id: c.id,
        confidence: 0.0,
        evidence: 'Initial state'
      }));
    }

    // 4. Append user's message
    history.push({ role: 'user', content: userMessage.trim() });

    // 5. Build prompt
    const conceptsText = JSON.stringify(conceptsList, null, 2);
    const historyText = history.map(m => `${m.role === 'user' ? 'User' : 'Tutor'}: ${m.content}`).join('\n');

    const prompt = `You are the Mental Model Extractor (Agent 2).
You run a Socratic conversation with the user to diagnose their understanding of a specific topic.
The topic has been mapped into the following list of concepts:
${conceptsText}

Your instructions:
1. Conduct a natural, friendly Socratic conversation. Ask exactly ONE clear question to probe the user's understanding of one or more of these concepts.
2. Based on the conversation history (listed below), evaluate the user's understanding.
3. For any concepts they demonstrate understanding or lack thereof, output a confidence update.
   - confidence: a float from 0.0 (knows nothing / incorrect) to 1.0 (expert / complete clarity).
   - evidence: a brief 1-sentence note explaining the rating based on what they said.

Conversation history:
${historyText}

Format your output exactly as a single JSON object.
Example JSON output:
{
  "reply": "That is correct! Now, how does a closure 'remember' variables from its outer scope when that outer function has already finished executing?",
  "confidence_updates": [
    { "id": "closures", "confidence": 0.6, "evidence": "User correctly defined closures but hasn't explained lexical retention." }
  ]
}

Respond ONLY in valid JSON. No markdown. No explanation. No backticks.`;

    // 6. Call Gemini
    const result = await geminiModel.generateContent(prompt);
    const response = await result.response;
    let text = response.text().trim();

    // Remove markdown code fence wrappers if present
    if (text.startsWith('```')) {
      text = text.replace(/^```json\s*/i, '').replace(/```$/, '').trim();
    }

    // 7. Parse the response
    let agentOutput;
    try {
      agentOutput = JSON.parse(text);
    } catch (parseError) {
      console.error('Failed to parse Gemini output as JSON. Raw text:', text);
      return res.status(500).json({
        error: 'AI generated invalid JSON structure',
        details: parseError.message
      });
    }

    const reply = agentOutput.reply || "Could you explain that in more detail?";
    const confidenceUpdates = agentOutput.confidence_updates || [];

    // 8. Merge confidence updates into userModel
    for (const update of confidenceUpdates) {
      const idx = userModel.findIndex(item => item.id === update.id);
      if (idx !== -1) {
        userModel[idx] = {
          id: update.id,
          confidence: typeof update.confidence === 'number' ? update.confidence : userModel[idx].confidence,
          evidence: update.evidence || userModel[idx].evidence
        };
      } else {
        // Concept wasn't in initial list, but was updated. Add it anyway.
        userModel.push({
          id: update.id,
          confidence: typeof update.confidence === 'number' ? update.confidence : 0.0,
          evidence: update.evidence || ''
        });
      }
    }

    // 9. Append tutor's reply to history
    history.push({ role: 'assistant', content: reply });

    // 10. Upsert conversation record
    let dbResult;
    if (convData) {
      const { data, error } = await supabase
        .from('conversations')
        .update({
          messages: history,
          user_model: userModel
        })
        .eq('id', convData.id)
        .select();

      if (error) {
        console.error('Supabase update conversation error:', error);
        return res.status(500).json({ error: 'Failed to update conversation in database', details: error.message });
      }
      dbResult = data;
    } else {
      const { data, error } = await supabase
        .from('conversations')
        .insert([
          {
            session_id: sessionId,
            messages: history,
            user_model: userModel
          }
        ])
        .select();

      if (error) {
        console.error('Supabase insert conversation error:', error);
        return res.status(500).json({ error: 'Failed to insert conversation to database', details: error.message });
      }
      dbResult = data;
    }

    if (!dbResult || dbResult.length === 0) {
      return res.status(500).json({ error: 'No data returned from database conversation upsert' });
    }

    // 11. Return response conforming to API contract
    return res.status(200).json({
      reply,
      updatedUserModel: userModel
    });

  } catch (error) {
    console.error('Error in agent2 endpoint:', error);
    return res.status(500).json({
      error: 'Internal server error in Mental Model Extractor',
      message: error.message
    });
  }
});

module.exports = router;
