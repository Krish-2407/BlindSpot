# BlindSpot — Session Context File
> Update this file at the END of every coding session.
> Paste this file at the START of every new Antigravity/Cursor/AI session.

---

## What BlindSpot Is
A 3-screen web app that finds knowledge gaps a user doesn't know they have.
Flow: User enters topic → short AI conversation → sees blind spot map + Socratic questions.
Stack: React + Vite (frontend) · Node + Express (backend) · Gemini API (AI) · Supabase (DB) · Vercel + Railway (hosting)

---

## Current Project State
**Latest session note:** Wednesday Day 4/5 - Added Groq agent tracing and confirmed repeated Java questions were caused by an old Node process serving fallback code on port 3000. A fresh backend process produced a real Java roadmap through Groq and Agent 2 asked "What's a variable in Java?"
**Latest bugfix:** Thursday Day 5 - Fixed Conversation screen turn counting so the automatic bootstrap message is not counted as a user answer; users can now answer all 5 AI questions before the results button appears.
**Phase:** Phase 4 — Polish and Deploy (In Progress - CORS configuration and Railway preparation complete)
**Last updated:** Tuesday (Day 4 — Configured package.json start script, dynamic CORS origins, and railway.toml configuration for backend hosting deployment)
**Next session goal:** Replace placeholder gap map with a basic D3.js node graph, deploy backend to Railway, and deploy frontend to Vercel.

---

## What Is Built So Far
- [x] Backend folder initialized with npm and dependencies
- [x] Implemented config/supabase.js (Supabase client helper)
- [x] Implemented config/gemini.js (Gemini API model client)
- [x] Implemented routes/agent1.js (Expert Knowledge Mapper endpoint)
- [x] Implemented routes/agent2.js (Socratic Mental Model Extractor endpoint)
- [x] Implemented server.js (Express server entrypoint)
- [x] Scaffolded backend/.env file
- [x] Verified routing files compile and load dependencies correctly without runtime import/export errors
- [x] Verified and tested routing endpoints locally using integration test suite mock inputs and output schemas
- [x] Scaffolded React + Vite frontend workspace
- [x] Installed and integrated Tailwind CSS, PostCSS, and Autoprefixer
- [x] Configured custom brand palette in tailwind.config.js (glow states, dark card, emerald highlights)
- [x] Added Google Outfit & Inter typography with customized base html/body styles
- [x] Installed Axios and React Router dependencies
- [x] Configured frontend environment variables in `.env`
- [x] Created global `FlowContext` to manage active topic, session ID, master graph, and chat history
- [x] Built premium pass-through `Layout` root container
- [x] Fully implemented frontend UI pages `Home`, `Conversation`, and `Results` using brand style guide
- [x] Integrated `Home` page with backend `/api/agent1` and initial Socratic question bootstrap
- [x] Integrated `Conversation` Socratic chat page with backend `/api/agent2`
- [x] Connected all pages dynamically to global state hooks in `FlowContext`
- [x] Verified build compiles successfully with zero warnings
- [x] Implemented robust frontend loading states, spinner states, and stagger animations across all three screens
- [x] Standardized API failure try-catch errors and added interactive retry handlers to Home, Conversation, and Results pages
- [x] Fixed critical bugs (clearing old sessions in Home, sending full message array in Socratic Chat, double results fetch)
- [x] Migrated backend agent routes to Groq SDK calls using `GROQ_API_KEY`
- [x] Added live backend debug traces in `backend/debug/agent-latest.json` and `backend/debug/agent-events.jsonl`
- [x] Verified fresh backend process generates a Java expert graph through Groq and Agent 2 asks a Java-specific question
- [x] Fixed Conversation screen answer counter so the fifth AI question remains answerable before showing results

---

## Folder Structure So Far
```
blindspot/               ← root folder (GitHub repo)
  backend/
    config/
      gemini.js          ← implemented
      supabase.js        ← implemented
    node_modules/
    routes/
      agent1.js          ← implemented
      agent2.js          ← implemented
      agent3.js          ← implemented
      agent4.js          ← implemented
    .env
    package.json
    package-lock.json
    server.js            ← implemented
  frontend/
    public/
      favicon.svg
    src/
      assets/
      components/
        Layout.jsx       ← created (premium glassmorphic wrapper)
      context/
        FlowContext.jsx  ← created (global user flow state manager)
      pages/
        Home.jsx         ← created (topic submission panel)
        Conversation.jsx ← created (Socratic chat panel)
        Results.jsx      ← created (gap analysis visualizer panel)
      App.jsx            ← updated with FlowContext, Router, and Layout
      index.css          ← updated with Tailwind directives & fonts
      main.jsx
    .env                 ← created (VITE_API_URL)
    index.html           ← updated title & SEO description
    postcss.config.js    ← created
    tailwind.config.js   ← created with custom colors & shadows
    vite.config.js
  agents.md
  tasks.md
  context.md
```

---

## Files That Exist
- `backend/config/supabase.js`
- `backend/config/gemini.js`
- `backend/routes/agent1.js`
- `backend/routes/agent2.js`
- `backend/routes/agent3.js`
- `backend/routes/agent4.js`
- `backend/server.js`
- `backend/.env`
- `backend/package.json`
- `backend/package-lock.json`
- `frontend/src/components/Layout.jsx`
- `frontend/src/context/FlowContext.jsx`
- `frontend/src/pages/Home.jsx`
- `frontend/src/pages/Conversation.jsx`
- `frontend/src/pages/Results.jsx`
- `frontend/src/App.jsx`
- `frontend/src/index.css`
- `frontend/src/main.jsx`
- `frontend/.env`
- `frontend/index.html`
- `frontend/tailwind.config.js`
- `frontend/postcss.config.js`
- `frontend/package.json`
- `frontend/vite.config.js`
- `.gitignore`
- `README.md`
- `agents.md`
- `tasks.md`
- `context.md`

---

## Live Debug Files
```
backend/debug/agent-latest.json   # latest output/state for Agents 1-4
backend/debug/agent-events.jsonl  # append-only event stream with raw Groq outputs and fallback reasons
backend/utils/agentTrace.js       # trace writer used by agent routes
backend/config/groq.js            # Groq SDK client
```

---

## Environment Variables Needed
```
# backend/.env
GEMINI_API_KEY=
GROQ_API_KEY=
SUPABASE_URL=
SUPABASE_ANON_KEY=
PORT=3000

# frontend/.env
VITE_API_URL=http://localhost:3000
```

---

## What To Build Next
Phase 4 tasks — in order:
1. Tighten Agent 2 prompt so follow-up questions adapt more deeply to the user's answer and expert graph
2. Replace Screen 3 placeholder gap map with a basic D3.js node graph
3. Deploy backend to Railway and configure service settings
4. Deploy frontend to Vercel and wire up VITE_API_URL environment variable

---

## Known Issues / Blockers
- If Java/other topics show fallback questions like "Could you explain what X Fundamentals...", confirm the browser is hitting a fresh backend process. A stale Node process on port 3000 previously served old fallback code.
- The old `gemini.js` config still exists but current agent routes use Groq. Remove or archive it once the migration is fully settled.

---

## Decisions Made So Far
- Backend agent routes currently use Groq SDK with `llama-3.3-70b-versatile`
- Using Supabase free tier for database
- Using Railway for backend hosting, Vercel for frontend hosting
- All 4 AI agents use the same Groq API key — different prompts, same service

---

## How To Update This File
At the end of every session, update:
1. "Current Project State" — what phase, what was completed
2. "What Is Built So Far" — tick off completed tasks
3. "Folder Structure So Far" — add any new files created
4. "What To Build Next" — the next 3-5 tasks in order
5. "Known Issues / Blockers" — anything broken or unclear
