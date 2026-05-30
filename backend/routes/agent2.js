const express = require('express');
const router = express.Router();
const supabase = require('../config/supabase');
const groq = require('../config/groq');
const { recordAgentEvent, normalizeError } = require('../utils/agentTrace');

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
    const { sessionId, messages, userMessage } = req.body;

    // 1. Validate request body fields
    if (!sessionId || typeof sessionId !== 'string') {
      return res.status(400).json({ error: 'Missing or invalid required field: sessionId' });
    }
    if (!userMessage || typeof userMessage !== 'string' || !userMessage.trim()) {
      return res.status(400).json({ error: 'Missing or invalid required field: userMessage' });
    }

    // Step 1 - Log sessionId received
    console.log('Agent 2 - sessionId received:', sessionId)

    // Step 2 - Fetch the session from Supabase
    const { data: sessionData, error: sessionError } = await supabase
      .from('sessions')
      .select('expert_graph, topic')
      .eq('id', sessionId)
      .single()

    console.log('Agent 2 - session fetched:', sessionData?.topic)
    console.log('Agent 2 - expert_graph nodes:', sessionData?.expert_graph?.nodes?.length)

    if (sessionError || !sessionData) {
      console.error('Supabase fetch session error:', sessionError);
      return res.status(404).json({ error: 'Session not found' })
    }

    const expertGraph = sessionData.expert_graph || { nodes: [], edges: [] };
    const conceptsList = (expertGraph.nodes || []).map(node => ({
      id: node.id,
      label: node.label,
      description: node.description
    }));

    // opening explanation may be saved as a top-level column or embedded
    // inside the saved expert_graph JSON (legacy/safe storage). Try both.
    let openingExplanation = '';
    if (sessionData.opening_explanation) {
      openingExplanation = sessionData.opening_explanation;
    } else if (sessionData.expert_graph && sessionData.expert_graph.opening_explanation) {
      openingExplanation = sessionData.expert_graph.opening_explanation;
    }
    recordAgentEvent('agent2', 'request_received', {
      sessionId,
      topic: sessionData.topic,
      openingExplanation,
      userMessage: userMessage.trim(),
      expertGraphNodesCount: conceptsList.length
    });

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

      // If the user provided an opening explanation when creating the session,
      // include it as an initial user message so the Socratic tutor knows what
      // the user already stated and will avoid re-asking about those concepts.
      if (openingExplanation && !history.find(m => m.content === openingExplanation)) {
        history.unshift({ role: 'user', content: openingExplanation });
      }

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
    const expert_graph = expertGraph;
    const opening_explanation = openingExplanation;

    const knownConcepts = expert_graph.nodes
      .filter(n => {
        const openingLower = opening_explanation.toLowerCase();
        const labelLower = n.label.toLowerCase();
        const idLower = n.id.toLowerCase();
        
        if (openingLower.includes(labelLower) || openingLower.includes(idLower)) {
          return true;
        }

        const openingWords = openingLower.split(/[^a-z0-9]+/).filter(w => w.length >= 3);
        const stopWords = ['the', 'and', 'for', 'with', 'from', 'this', 'that', 'its', 'are', 'there'];
        
        for (const word of openingWords) {
          if (stopWords.includes(word)) continue;
          if (labelLower.includes(word) || idLower.includes(word)) {
            return true;
          }
        }
        
        return false;
      })
      .map(n => n.id);

    const discussedIds = history
      .filter(m => m.discussed_concept)
      .map(m => m.discussed_concept);

    const priorityConceptsNodes = expert_graph.nodes
      .filter(n => !knownConcepts.includes(n.id))
      .filter(n => !discussedIds.includes(n.id))
      .sort((a, b) => b.unlock_score - a.unlock_score)
      .slice(0, 8);

    const priorityConcepts = priorityConceptsNodes
      .map(n => `- ${n.id}: ${n.label} (unlock score: ${n.unlock_score}) — ${n.description}`)
      .join('\n');

    const knownList = expert_graph.nodes
      .filter(n => knownConcepts.includes(n.id))
      .map(n => n.label)
      .join(', ');

    const currentConceptId = priorityConceptsNodes[0]?.id || null;

    const historyText = history.map(m => `${m.role === 'user' ? 'User' : 'Tutor'}: ${m.content}`).join('\n');

    const prompt = `You are a Socratic tutor for: ${sessionData.topic}

The student already knows: ${knownList || 'None'}
DO NOT ask about any of these. Treat them as mastered.

These are the highest value unknown concepts to explore — pick the FIRST one the student has not discussed:
${priorityConcepts || 'None'}

Ask ONE natural question about the first concept in this list. Mention the concept name naturally.
Under 20 words. Conversational tone.

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
      // 6. Call Groq
      recordAgentEvent('agent2', 'groq_request', {
        provider: 'groq',
        model: 'llama-3.3-70b-versatile',
        sessionId,
        topic: sessionData.topic,
        historyLength: history.length,
        concepts: conceptsList
      });

      const chatCompletion = await groq.chat.completions.create({
        model: "llama-3.3-70b-versatile",
        response_format: { type: "json_object" },
        messages: [{ role: "user", content: prompt }]
      });
      
      let parsed;
      try {
        const rawText = chatCompletion.choices[0].message.content.trim();
        console.log('Agent 2 raw response:', rawText);
        
        // Strip markdown backticks if present
        const cleaned = rawText
          .replace(/```json/g, '')
          .replace(/```/g, '')
          .trim();
          
        parsed = JSON.parse(cleaned);
        recordAgentEvent('agent2', 'groq_response_parsed', {
          sessionId,
          topic: sessionData.topic,
          rawResponse: rawText,
          parsed
        });
      } catch (parseError) {
        console.error('JSON parse failed:', parseError);
        console.error('Raw text was:', chatCompletion.choices[0].message.content);
        recordAgentEvent('agent2', 'parse_fallback_used', {
          sessionId,
          topic: sessionData.topic,
          reason: normalizeError(parseError),
          rawResponse: chatCompletion.choices[0].message.content
        });
        
        // Return a safe fallback so conversation doesn't break
        parsed = {
          reply: "Interesting. Can you tell me more about what you know?",
          confidence_updates: []
        };
      }
      
      reply = parsed.reply || "Could you explain that in more detail?";
      confidenceUpdates = parsed.confidence_updates || [];
    } catch (apiError) {
      console.warn('Groq API call failed or rate-limited in Socratic chat. Falling back to mock reply. Error:', apiError.message);
      const fallbackResult = generateFallbackReply(userMessage, conceptsList, history.length);
      reply = fallbackResult.reply;
      confidenceUpdates = fallbackResult.confidence_updates;
      recordAgentEvent('agent2', 'fallback_used', {
        sessionId,
        topic: sessionData.topic,
        reason: normalizeError(apiError),
        fallbackReply: reply,
        confidenceUpdates
      });
    }

    // 8. Merge confidence updates into userModel
    const validConceptIds = (expertGraph.nodes || []).map(node => node.id);
    for (const update of confidenceUpdates) {
      if (!validConceptIds.includes(update.id)) {
        console.warn(`Agent 2 - Ignored out-of-graph concept update: ${update.id}`);
        continue;
      }
      const idx = userModel.findIndex(item => item.id === update.id);
      if (idx !== -1) {
        userModel[idx] = {
          id: update.id,
          confidence: typeof update.confidence === 'number' ? update.confidence : userModel[idx].confidence,
          evidence: update.evidence || userModel[idx].evidence
        };
      } else {
        userModel.push({
          id: update.id,
          confidence: typeof update.confidence === 'number' ? update.confidence : 0.0,
          evidence: update.evidence || ''
        });
      }
    }

    // Merge preSeededModel with existing user_model before saving to Supabase.
    const preSeededModel = knownConcepts.map(id => ({
      id,
      confidence: 0.85,
      evidence: 'Mentioned in opening explanation'
    }));

    for (const seed of preSeededModel) {
      const idx = userModel.findIndex(item => item.id === seed.id);
      if (idx !== -1) {
        if (userModel[idx].confidence === 0.0 && userModel[idx].evidence === 'Initial state') {
          userModel[idx] = seed;
        }
      } else {
        userModel.push(seed);
      }
    }

    // 9. Append tutor's reply to history
    history.push({ role: 'assistant', content: reply, discussed_concept: currentConceptId });

    recordAgentEvent('agent2', 'reply_ready', {
      sessionId,
      topic: sessionData.topic,
      reply,
      confidenceUpdates,
      userModel
    });

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
