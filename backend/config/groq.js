const Groq = require('groq-sdk');

const apiKey = process.env.GROQ_API_KEY;

if (!apiKey) {
  throw new Error('Missing environment variable: GROQ_API_KEY');
}

const groq = new Groq({
  apiKey: apiKey,
});

module.exports = groq;
