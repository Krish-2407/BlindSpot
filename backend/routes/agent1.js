const express = require('express');
const router = express.Router();
const supabase = require('../config/supabase');
const geminiModel = require('../config/gemini');

router.post('/', async (req, res) => {
  try {
    const { topic, openingExplanation } = req.body;

    // 1. Validate request body fields
    if (!topic || typeof topic !== 'string' || !topic.trim()) {
      return res.status(400).json({ error: 'Missing or invalid required field: topic' });
    }

    // 2. Prepare Gemini Prompt
    const prompt = `You are the Expert Knowledge Mapper (Agent 1).
Build a concept dependency graph for the topic: "${topic}".
User's opening explanation/context: "${openingExplanation || 'None'}"

The graph must represent a detailed learning path containing 15-25 nodes representing key concepts (ordered logically from fundamental to advanced).
Each node must have:
- id: a unique identifier in kebab-case (e.g. "closures")
- label: a short, clear human-readable name (e.g. "Closures")
- unlock_score: a number from 1.0 to 10.0 representing how many downstream concepts depend on or are unlocked by this concept
- description: a concise 1-sentence definition of the concept

The edges represent prerequisite relationships. The "from" node must be a prerequisite for the "to" node.
Format your output exactly as a single JSON object.

Example JSON output structure:
{
  "nodes": [
    { "id": "functions", "label": "Functions", "unlock_score": 9.5, "description": "Reusable blocks of code performing specific tasks." },
    { "id": "closures", "label": "Closures", "unlock_score": 8.0, "description": "A function that retains access to its outer lexical scope." }
  ],
  "edges": [
    { "from": "functions", "to": "closures" }
  ]
}

Respond ONLY in valid JSON. No markdown. No explanation. No backticks.`;

    // 3. Call Gemini API
    const result = await geminiModel.generateContent(prompt);
    const response = await result.response;
    let text = response.text().trim();

    // Remove markdown code fence wrappers if present
    if (text.startsWith('```')) {
      text = text.replace(/^```json\s*/i, '').replace(/```$/, '').trim();
    }

    // 4. Parse the output
    let expertGraph;
    try {
      expertGraph = JSON.parse(text);
    } catch (parseError) {
      console.error('Failed to parse Gemini output as JSON. Raw text:', text);
      return res.status(500).json({
        error: 'AI generated invalid JSON structure',
        details: parseError.message
      });
    }

    // 5. Save parsed output to Supabase sessions table
    const { data, error } = await supabase
      .from('sessions')
      .insert([
        {
          topic: topic.trim(),
          expert_graph: expertGraph
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

    // 6. Return response conforming to API contract
    return res.status(200).json({
      sessionId,
      expertGraph
    });

  } catch (error) {
    console.error('Error in agent1 endpoint:', error);
    return res.status(500).json({
      error: 'Internal server error in Expert Knowledge Mapper',
      message: error.message
    });
  }
});

module.exports = router;
