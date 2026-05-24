# BlindSpot — Agent Orchestration Configuration

## Project Context
BlindSpot is a 3-screen web app that finds knowledge gaps in what a user is learning. The user types a topic, has a short conversation with an AI, and receives a visual map of their blind spots plus Socratic questions they never thought to ask.

### Internal 4-Agent AI Pipeline (all run on one Gemini API key)
| Agent | Name | Job |
|-------|------|-----|
| Agent 1 | Expert Knowledge Mapper | Builds a concept dependency graph for any topic |
| Agent 2 | Mental Model Extractor | Runs multi-turn conversation, scores user confidence per concept |
| Agent 3 | Gap Ranker | Diffs expert graph vs user model, ranks gaps by unlock value |
| Agent 4 | Socratic Output | Converts top gaps into questions the user never thought to ask |

### Core Data Contracts Between Agents
```json
// Agent 1 output
{
  "nodes": [{ "id": "closures", "unlock_score": 8.4, "depth": 2, "description": "..." }],
  "edges": [{ "from": "closures", "to": "useState" }]
}

// Agent 2 output
{
  "user_model": [{ "id": "closures", "confidence": 0.3, "evidence": "mentioned but couldn't explain stale closure" }]
}

// Agent 3 output
{
  "ranked_gaps": [{ "concept": "closures", "priority": 8.7, "downstream": ["useState", "useEffect"], "why": "..." }]
}

// Agent 4 output
{
  "questions": [{ "order": 1, "gap": "closures", "question": "...", "intent": "..." }]
}
```

### API Contract Between Frontend and Backend
```
POST /api/agent1
Body:    { topic: string, openingExplanation: string }
Returns: { sessionId: string, expertGraph: {} }

POST /api/agent2
Body:    { sessionId: string, messages: [], userMessage: string }
Returns: { reply: string, updatedUserModel: [] }

POST /api/agent3
Body:    { sessionId: string }
Returns: { rankedGaps: [] }

POST /api/agent4
Body:    { sessionId: string }
Returns: { questions: [] }
```

---

## Blueprint Personas

### 1. Lead Architect
- **Purpose:** Reads incoming task specifications, maps code dependencies, ensures no breaking changes occur across files, and flags conflicts before code is written.
- **Access:** Read/Write on project blueprints, routing architecture, API contracts, and data schemas.
- **Rules:**
  - Before writing any code, confirm which files already exist and what they export.
  - Never change a function signature or API response shape without updating the API contract in context.md.
  - If a task touches both frontend and backend, define the data shape first, then delegate separately.

### 2. Full-Stack Developer
- **Purpose:** Writes complete, working frontend components and backend routes. No partial logic, no placeholders.
- **Frontend Rules:**
  - Use modular inline Tailwind CSS classes only. No external stylesheets.
  - All components must be self-contained and accept props where reusable.
  - Never write `// TODO` or skeleton code. Every function must be fully implemented.
- **Backend Rules:**
  - Every route must have a try/catch block and return descriptive JSON errors.
  - Always validate incoming request body fields before using them.
  - Use async/await throughout. No raw promise chains.
  - Every route file must export a router, not inline the app.

### 3. Prompt Specialist
- **Purpose:** Writes and refines the Gemini API system prompts for all 4 internal agents. Enforces strict JSON output contracts.
- **Rules:**
  - Every prompt must end with: "Respond ONLY in valid JSON. No markdown. No explanation. No backticks."
  - Always include a concrete example of the expected JSON output inside the prompt.
  - Keep prompts under 400 tokens where possible to reduce API cost and latency.
  - If a prompt produces inconsistent output during testing, add a negative instruction: "Do NOT include X."
  - Test every prompt in Google AI Studio before wiring it into backend code.

### 4. QA Tester
- **Purpose:** Checks every completed file for syntax errors, broken imports, and integration mismatches before moving to the next task.
- **Rules:**
  - Run `node --check filename.js` on every new backend file before marking a task complete.
  - Run `npm run build` on the frontend before marking any Phase 2 task complete.
  - Check that every API route the frontend calls matches exactly what the backend defines.
  - If any error is found, capture the full terminal trace and return it immediately for a fix. Do not proceed to the next task until the current one passes.

---

## Global Workspace Policies
- **Output format:** Return complete, working files. Include a maximum 3-line explanation of any non-obvious decision. No filler text, no summaries.
- **Strict layer isolation:** Do not modify frontend files while a backend task is running, and vice versa.
- **No assumptions:** If a file's contents are unknown, ask before writing code that imports from it.
- **Context first:** At the start of every session, read context.md before doing anything else.
