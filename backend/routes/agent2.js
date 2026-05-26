const express = require('express');
const router = express.Router();
const supabase = require('../config/supabase');
const geminiModel = require('../config/gemini');

function generateFallbackReply(userMessage, conceptsList, turnNumber) {
  const responses = [
    `Could you explain what ${conceptsList[0]?.label || 'the fundamentals'} mean in your own words?`,
    `How does that relate to ${conceptsList[Math.min(2, conceptsList.length - 1)]?.label || 'other concepts'}?`,
    `Why do you think it is designed to work this way?`,
    `What is a common mistake beginners make when working with this?`,
    `How does it connect to ${conceptsList[conceptsList.length - 1]?.label || 'advanced concepts'}?`
  ];
  
  const turnIndex = Math.floor(turnNumber / 2);
  const reply = responses[Math.min(turnIndex, responses.length - 1)] || "Could you clarify that?";

  const updatedConceptIndex = Math.min(turnIndex, conceptsList.length - 1);
  const conceptId = conceptsList[updatedConceptIndex]?.id;

  const confidenceUpdates = [];
  if (conceptId) {
    confidenceUpdates.push({
      id: conceptId,
      confidence: Math.min(1.0, 0.2 + (turnIndex * 0.15)),
      evidence: `Demonstrates basic understanding of ${conceptsList[updatedConceptIndex]?.label} in Socratic dialogue.`
    });
  }

  return {
    reply,
    confidence_updates: confidenceUpdates
  };
}

router.post('/', async (req, res) => {
  try {
    console.log('Agent 2 hit - body received:', req.body)
    console.log('sessionId:', req.body.sessionId)
    console.log('userMessage:', req.body.userMessage)
    console.log('messages length:', req.body.messages?.length)

    const { sessionId, messages, userMessage } = req.body;

    // 1. Validate request body fields
    if (!sessionId || typeof sessionId !== 'string') {
      return res.status(400).json({ error: 'Missing or invalid required field: sessionId' });
    }
    if (!userMessage || typeof userMessage !== 'string' || !userMessage.trim()) {
      return res.status(400).json({ error: 'Missing or invalid required field: userMessage' });
    }

    // 2. Fetch session and expert graph
    let sessionData;
    let sessionError;
    try {
      console.log('Fetching session from Supabase...')
      const { data: session, error } = await supabase
        .from('sessions')
        .select('expert_graph')
        .eq('id', req.body.sessionId)
        .maybeSingle()
        
      console.log('Session fetch result:', session, 'Error:', error)
      sessionData = session;
      sessionError = error;
    } catch (dbError) {
      console.error('Supabase fetch failed:', dbError)
      sessionError = dbError;
    }

    if (sessionError) {
      console.error('Supabase fetch session error:', sessionError);
      return res.status(500).json({ error: 'Failed to retrieve session from database', details: sessionError.message || String(sessionError) });
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

    // 3. Fetch existing conversation (use limit(1) to safely handle any duplicate rows)
    const { data: convRows, error: convError } = await supabase
      .from('conversations')
      .select('*')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: false })
      .limit(1)

    const convData = convRows && convRows.length > 0 ? convRows[0] : null

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

    const prompt = `You are a friendly Socratic learning companion helping 
someone discover their knowledge gaps. You are NOT a 
technical interviewer. You are a curious friend.

Your conversation rules:
- Ask ONE simple, conversational question per turn
- Start easy, get gradually deeper over 5 turns
- Ask about concepts the user has NOT mentioned yet
- Never repeat a question you already asked
- Never ask about scaling, production, or test cases
- Keep questions under 20 words
- Sound human, not robotic

Turn 1: Ask them to explain one basic concept simply
Turn 2: Ask about a related concept they haven't mentioned
Turn 3: Ask why something works the way it does
Turn 4: Ask about a common mistake beginners make
Turn 5: Ask about the most advanced concept they haven't touched

Expert knowledge graph for reference: ${JSON.stringify(expertGraph, null, 2)}

After each user message, score their confidence on 
concepts they touched. Be honest — if they said 
'I don't know', score that concept 0.0.

Respond ONLY in this exact JSON format, no markdown:
{
  "reply": "your single conversational question here",
  "confidence_updates": [
    { "id": "concept_id", "confidence": 0.0, "evidence": "what they said" }
  ]
}

Conversation history:
${historyText}`;

    let reply;
    let confidenceUpdates = [];
    try {
      // 6. Call Gemini
      const result = await geminiModel.generateContent(prompt);
      
      let parsed;
      try {
        const rawText = result.response.text();
        console.log('Agent 2 raw response:', rawText);
        
        // Strip markdown backticks if present
        const cleaned = rawText
          .replace(/```json/g, '')
          .replace(/```/g, '')
          .trim();
          
        parsed = JSON.parse(cleaned);
      } catch (parseError) {
        console.error('JSON parse failed:', parseError);
        console.error('Raw text was:', result.response.text());
        
        // Return a safe fallback so conversation doesn't break
        parsed = {
          reply: "Interesting. Can you tell me more about what you know?",
          confidence_updates: []
        };
      }
      
      reply = parsed.reply || "Could you explain that in more detail?";
      confidenceUpdates = parsed.confidence_updates || [];
    } catch (apiError) {
      console.warn('Gemini API call failed or rate-limited in Socratic chat. Falling back to mock reply. Error:', apiError.message);
      const fallbackResult = generateFallbackReply(userMessage, conceptsList, history.length);
      reply = fallbackResult.reply;
      confidenceUpdates = fallbackResult.confidence_updates;
    }

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

    // Note: dbResult may be empty array if RLS blocks the SELECT after insert — that's OK,
    // the data was saved. We proceed regardless.

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
