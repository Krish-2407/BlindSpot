function sanitizeInput(text) {
  if (!text || typeof text !== 'string') return '';
  return text
    .replace(/[\[\]\{\}\\]/g, '')
    .replace(/ignore\s+(?:previous|above|system|all)\s+instructions/gi, '')
    .replace(/ignore\s+instructions/gi, '')
    .trim();
}

module.exports = { sanitizeInput };
