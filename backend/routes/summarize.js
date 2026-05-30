const express = require('express');
const router = express.Router();
const groq = require('../config/groq');

// POST /api/summarize
router.post('/', async (req, res) => {
  try {
    const { text } = req.body;

    if (!text || typeof text !== 'string' || !text.trim()) {
      return res.status(400).json({ error: 'Missing or invalid explanation text' });
    }

    // Call Groq using the ultra-fast Llama-3.1 8B model
    const chatCompletion = await groq.chat.completions.create({
      messages: [
        {
          role: 'system',
          content: 'You are a professional Socratic knowledge compressor. Summarize the user\'s explanation of what they understand about a topic in under 2,000 characters. Keep their core terminology, but compress the explanation so it is extremely dense, readable, and clean. Respond ONLY with the clean summarized text. Do NOT include conversational filler, introductory remarks, markdown formatting, or quotes.'
        },
        {
          role: 'user',
          content: text.trim()
        }
      ],
      model: 'llama-3.1-8b-instant',
      temperature: 0.3,
      max_tokens: 600
    });

    const summary = chatCompletion.choices[0]?.message?.content?.trim();

    if (!summary) {
      return res.status(500).json({ error: 'Failed to generate summary from AI model' });
    }

    return res.status(200).json({ summary });

  } catch (error) {
    console.error('Error during AI summarization:', error);
    return res.status(500).json({
      error: 'Internal server error during summarization',
      message: error.message
    });
  }
});

module.exports = router;
