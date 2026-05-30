const express = require('express');
const router = express.Router();
const supabase = require('../config/supabase');
const groq = require('../config/groq');
const { recordAgentEvent, normalizeError } = require('../utils/agentTrace');
const { sanitizeInput } = require('../utils/sanitize');
const { generateFallbackGraph } = require('../utils/fallbacks');


router.post('/', async (req, res, next) => {
  try {
    let { topic, openingExplanation } = req.body;

    // Sanitize input to mitigate prompt injection
    topic = sanitizeInput(topic);
    openingExplanation = sanitizeInput(openingExplanation);

    // 1. Validate request body fields
    if (!topic || typeof topic !== 'string' || !topic.trim()) {
      return res.status(400).json({ error: 'Missing or invalid required field: topic' });
    }
    if (topic.length > 500) {
      return res.status(400).json({ error: 'Topic too long. Maximum 500 characters.' });
    }
    if (openingExplanation && openingExplanation.length > 10000) {
      return res.status(400).json({ error: 'Opening explanation too long. Maximum 10,000 characters.' });
    }

    recordAgentEvent('agent1', 'request_received', {
      topic: topic.trim(),
      openingExplanation: openingExplanation || ''
    });

    // 2. Prepare Groq Prompt
    const explanationContext = openingExplanation && openingExplanation.trim()
      ? `\nThe learner provided this self-assessment of their current knowledge:\n"${openingExplanation.trim()}"\nUse this to emphasize concepts they seem weak on and include concepts they may be overconfident about.\n`
      : '';

    const prompt = `You are an expert educator and knowledge graph builder.
Generate a comprehensive concept dependency graph for 
the topic: ${topic}
${explanationContext}
You MUST generate between 15 and 25 concept nodes.
This is mandatory. Do not generate fewer than 15 nodes.

Think about everything a true expert in ${topic} would know:
- Foundational basics
- Core concepts
- Intermediate patterns
- Advanced topics
- Common pitfalls and edge cases

CRITICAL LANGUAGE CONSTRAINT: Even if the topic or learner self-assessment is written in Hindi (in Devanagari script) or is a mix of Hindi and English (Hinglish), you MUST output all JSON values (node labels, descriptions, IDs) exclusively in English. Translate any Hindi terms to standard English.

Return ONLY valid JSON. No markdown. No backticks. 
No explanation. Start directly with { and end with }

Use exactly this structure:
{
  "nodes": [
    {
      "id": lowercase_underscore_string,
      "label": Human Readable Name,
      "description": one sentence what this concept is,
      "unlock_score": number between 1 and 10,
      "depth": 1 for basic, 2 for intermediate, 3 for advanced
    }
  ],
  "edges": [
    {
      "from": concept_id_that_must_be_learned_first,
      "to": concept_id_that_depends_on_it
    }
  ]
}

Example for topic JavaScript:
{
  "nodes": [
    { "id": "variables", "label": "Variables & Data Types", "description": "Storing and typing data in JS", "unlock_score": 9, "depth": 1 },
    { "id": "functions", "label": "Functions", "description": "Reusable blocks of logic", "unlock_score": 8, "depth": 1 },
    { "id": "closures", "label": "Closures", "description": "Functions retaining outer scope", "unlock_score": 7, "depth": 2 }
  ],
  "edges": [
    { "from": "variables", "to": "functions" },
    { "from": "functions", "to": "closures" }
  ]
}

Now generate the full graph for: ${topic}
Remember: minimum 15 nodes, maximum 25 nodes.`;

    let expertGraph;
    try {
      // 3. Call Groq API
      recordAgentEvent('agent1', 'groq_request', {
        provider: 'groq',
        model: 'llama-3.3-70b-versatile',
        topic: topic.trim()
      });

      const chatCompletion = await groq.chat.completions.create({
        model: "llama-3.3-70b-versatile",
        response_format: { type: "json_object" },
        messages: [{ role: "user", content: prompt }]
      });
      let rawText = chatCompletion.choices[0].message.content.trim();

      // Remove markdown code fence wrappers if present
      if (rawText.startsWith('```')) {
        rawText = rawText.replace(/^```json\s*/i, '').replace(/```$/, '').trim();
      }

      // Step 1: Parse
      const parsedGraph = JSON.parse(rawText);

      console.log('Agent 1 - topic received:', topic);
      console.log('Agent 1 - raw Groq response:', rawText);
      console.log('Agent 1 - parsed nodes count:', parsedGraph?.nodes?.length);
      console.log('Agent 1 - parsed edges count:', parsedGraph?.edges?.length);

      recordAgentEvent('agent1', 'groq_response_parsed', {
        topic: topic.trim(),
        nodesCount: parsedGraph?.nodes?.length || 0,
        edgesCount: parsedGraph?.edges?.length || 0,
        rawResponse: rawText,
        parsedGraph
      });

      // Step 3 - Validation
      if (!parsedGraph.nodes || parsedGraph.nodes.length < 5) {
        console.error('Agent 1 - Too few nodes generated:', parsedGraph.nodes?.length);
        return res.status(500).json({ 
          error: 'Failed to generate proper knowledge graph. Please try again.' 
        });
      }

      expertGraph = parsedGraph;
    } catch (apiError) {
      console.warn('Groq API call failed or rate-limited. Falling back to dynamic mock graph. Error:', apiError.message);
      expertGraph = generateFallbackGraph(topic);
      recordAgentEvent('agent1', 'fallback_used', {
        topic: topic.trim(),
        reason: normalizeError(apiError),
        fallbackGraph: expertGraph
      });
    }

    // 5. Save parsed output to Supabase sessions table
    // Embed the opening explanation into the expertGraph payload so we don't
    // require an immediate DB schema migration for a new column.
    const graphToSave = Object.assign({}, expertGraph, {
      opening_explanation: openingExplanation || ''
    });

    const { data, error } = await supabase
      .from('sessions')
      .insert([
        {
          topic: topic.trim(),
          expert_graph: graphToSave
        }
      ])
      .select();

    if (error) {
      console.error('Supabase insert error:', error);
      return res.status(500).json({ error: 'Failed to save session to database', details: error.message });
    }

    if (!data || data.length === 0) {
      return res.status(500).json({ error: 'No data returned from database insert' });
    }

    const sessionId = data[0].id;

    recordAgentEvent('agent1', 'session_saved', {
      sessionId,
      topic: topic.trim(),
      graphSource: expertGraph?.nodes?.some(node => String(node.id || '').includes(`${topic.trim().toLowerCase()}-core-syntax`))
        ? 'fallback_or_generic'
        : 'model_or_custom',
      nodesCount: expertGraph?.nodes?.length || 0,
      edgesCount: expertGraph?.edges?.length || 0
    });

    // 6. Return response conforming to API contract
    return res.status(200).json({
      sessionId,
      expertGraph
    });

  } catch (error) {
    error.clientMessage = 'Internal server error in Expert Knowledge Mapper';
    next(error);
  }
});

module.exports = router;
