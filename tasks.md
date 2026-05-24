# BlindSpot — Development Task Tracker

## Database Schema (Supabase)
```sql
-- Create these tables in Supabase before starting Phase 1

sessions (
  id          uuid primary key default gen_random_uuid(),
  topic       text not null,
  expert_graph jsonb,
  created_at  timestamp default now()
)

conversations (
  id          uuid primary key default gen_random_uuid(),
  session_id  uuid references sessions(id),
  messages    jsonb,
  user_model  jsonb,
  created_at  timestamp default now()
)

results (
  id          uuid primary key default gen_random_uuid(),
  session_id  uuid references sessions(id),
  ranked_gaps jsonb,
  questions   jsonb,
  created_at  timestamp default now()
)
```

---

## Phase 1 — Backend Foundation (Day 1)
- [x] Initialize backend folder, run `npm init -y`, install dependencies:
      `express cors dotenv @supabase/supabase-js @google/generative-ai`
- [x] Create `config/supabase.js` — Supabase client initialization helper
- [x] Create `config/gemini.js` — Gemini client initialization helper
- [x] Create `.env` file with: `GEMINI_API_KEY`, `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `PORT=3000`
- [x] Create `server.js` — Express app entry point with CORS, JSON middleware, and route mounting
- [x] Build `routes/agent1.js` — Expert Knowledge Mapper endpoint
      - Accepts: `{ topic, openingExplanation }`
      - Calls Gemini with concept graph prompt
      - Saves result to Supabase `sessions` table
      - Returns: `{ sessionId, expertGraph }`
- [x] Build `routes/agent2.js` — Mental Model Extractor endpoint
      - Accepts: `{ sessionId, messages, userMessage }`
      - Passes full conversation history to Gemini
      - Scores user confidence per concept after each message
      - Saves updated user model to Supabase `conversations` table
      - Returns: `{ reply, updatedUserModel }`
- [x] Test both routes using integration tests (mocking Supabase and Gemini) before moving to Phase 2
- [x] Run node syntax validation and module loader checks on routing files to verify imports and exports

---

## Phase 2 — Frontend Scaffolding (Day 2)
- [ ] Initialize frontend folder: `npm create vite@latest` (pick React)
- [ ] Install Tailwind CSS and configure `tailwind.config.js` and `index.css`
- [ ] Install axios: `npm install axios`
- [ ] Create `.env` file with: `VITE_API_URL=http://localhost:3000`
- [ ] Build Screen 1 — `pages/Home.jsx`
      - Topic input field
      - Opening explanation textarea
      - Submit button that calls POST /api/agent1
      - On success, navigate to Screen 2 with sessionId
- [ ] Build Screen 2 — `pages/Conversation.jsx`
      - Chat message list (user right, AI left)
      - Text input and send button
      - Calls POST /api/agent2 on each message
      - Shows turn counter (e.g. "3 of 6 turns")
      - "See my blind spots" button appears after final turn
- [ ] Build Screen 3 — `pages/Results.jsx`
      - Placeholder for gap map (static div for now)
      - List of 5 question cards with "Explore" button
      - Ordered learning path list
- [ ] Set up React Router with routes: `/`, `/conversation`, `/results`

---

## Phase 3 — Pipeline Integration (Day 3 — MVP due Wednesday)
- [ ] Build `routes/agent3.js` — Gap Ranker endpoint
      - Accepts: `{ sessionId }`
      - Reads expert graph and user model from Supabase
      - Runs BFS traversal to calculate unlock scores
      - Calls Gemini to score confusion multiplier
      - Saves ranked gaps to Supabase `results` table
      - Returns: `{ rankedGaps }`
- [ ] Build `routes/agent4.js` — Socratic Output endpoint
      - Accepts: `{ sessionId }`
      - Reads ranked gaps from Supabase
      - Calls Gemini to generate Socratic questions
      - Runs self-critique loop on each question
      - Saves questions to Supabase `results` table
      - Returns: `{ questions }`
- [ ] Wire Screen 2 "See my blind spots" button to call Agent 3 then Agent 4 in sequence
- [ ] Wire Screen 3 to read and display real data from Agent 4 output
- [ ] Replace Screen 3 placeholder gap map with basic D3.js node graph
- [ ] End-to-end test: full flow from topic input to results page
- [ ] Record screen demo and write product brief (3-4 sentences)
- [ ] ⚠️ SUBMIT MVP — product brief + working demo by end of Wednesday

---

## Phase 4 — Polish and Deploy (Day 4-5)
- [ ] Add loading states to all three screens (spinner while AI is thinking)
- [ ] Add error handling — show friendly message if API call fails
- [ ] Make UI responsive — test on mobile screen size
- [ ] Polish gap map — colour nodes green/amber/red by confidence score
- [ ] Add hover tooltips on gap map nodes
- [ ] Configure CORS on Express to allow Vercel domain
- [ ] Deploy frontend to Vercel
      - Connect GitHub repo
      - Set `VITE_API_URL` to Railway backend URL
- [ ] Deploy backend to Railway
      - Connect GitHub repo
      - Set all `.env` variables in Railway dashboard
- [ ] Smoke test full flow on live URLs
- [ ] Record 2-minute Loom demo video
- [ ] ✅ FINAL SUBMIT — live URL + GitHub repo + demo video

---

## Bonus Features (only if Phase 4 finishes early)
- [ ] Dialogue mode — clicking "Explore" on a question opens a Socratic chat
- [ ] Topic presets — React, Machine Learning, System Design ready to go
- [ ] Save and resume sessions across browser visits
