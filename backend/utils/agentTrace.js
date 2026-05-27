const fs = require('fs');
const path = require('path');

const debugDir = path.join(__dirname, '..', 'debug');
const latestPath = path.join(debugDir, 'agent-latest.json');
const eventsPath = path.join(debugDir, 'agent-events.jsonl');

function ensureDebugFiles() {
  fs.mkdirSync(debugDir, { recursive: true });
  if (!fs.existsSync(latestPath)) {
    fs.writeFileSync(latestPath, JSON.stringify({}, null, 2));
  }
  if (!fs.existsSync(eventsPath)) {
    fs.writeFileSync(eventsPath, '');
  }
}

function normalizeError(error) {
  if (!error) return null;

  return {
    name: error.name || 'Error',
    message: error.message || String(error),
    status: error.status || error.code || null,
    stack: error.stack || null
  };
}

function trimValue(value) {
  if (typeof value === 'string' && value.length > 8000) {
    return `${value.slice(0, 8000)}... [truncated ${value.length - 8000} chars]`;
  }

  if (Array.isArray(value)) {
    return value.map(trimValue);
  }

  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([key, nestedValue]) => [key, trimValue(nestedValue)])
    );
  }

  return value;
}

function readLatest() {
  ensureDebugFiles();

  try {
    return JSON.parse(fs.readFileSync(latestPath, 'utf8') || '{}');
  } catch (error) {
    return {};
  }
}

function recordAgentEvent(agent, stage, payload = {}) {
  ensureDebugFiles();

  const event = {
    timestamp: new Date().toISOString(),
    agent,
    stage,
    ...trimValue(payload)
  };

  fs.appendFileSync(eventsPath, `${JSON.stringify(event)}\n`);

  const latest = readLatest();
  latest[agent] = event;
  fs.writeFileSync(latestPath, JSON.stringify(latest, null, 2));
}

module.exports = {
  recordAgentEvent,
  normalizeError,
  paths: {
    latestPath,
    eventsPath
  }
};
