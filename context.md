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
**Phase:** Phase 2 — Live Backend Integration & Verification (Complete)
**Last updated:** Monday (Day 3 — Home and Conversation connected to live Agent 1 & Agent 2 APIs with premium loading shimmer, auto-bootloading, and dynamic database-synced card color rings)
**Next session goal:** Start Phase 3 — Pipeline Integration (Agent 3 Gap Ranker, Agent 4 Socratic Output, real D3.js node graph)

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

## Environment Variables Needed
```
# backend/.env
GEMINI_API_KEY=
SUPABASE_URL=
SUPABASE_ANON_KEY=
PORT=3000

# frontend/.env
VITE_API_URL=http://localhost:3000
```

---

## What To Build Next
Phase 3 tasks — in order:
1. Build `routes/agent3.js` — Gap Ranker endpoint (calculates unlock scores and confusion multipliers)
2. Build `routes/agent4.js` — Socratic Output endpoint (generates Socratic questions from gaps)
3. Wire Screen 2 "See my blind spots" button to call Agent 3 then Agent 4 in sequence
4. Wire Screen 3 to read and display real data from Agent 4 output
5. Replace Screen 3 placeholder gap map with a basic D3.js node graph

---

## Known Issues / Blockers
None yet.

---

## Decisions Made So Far
- Using Google Gemini API (free tier, no credit card needed) instead of OpenAI Codex
- Using Supabase free tier for database
- Using Railway for backend hosting, Vercel for frontend hosting
- All 4 AI agents use the same Gemini API key — different prompts, same service

---

## How To Update This File
At the end of every session, update:
1. "Current Project State" — what phase, what was completed
2. "What Is Built So Far" — tick off completed tasks
3. "Folder Structure So Far" — add any new files created
4. "What To Build Next" — the next 3-5 tasks in order
5. "Known Issues / Blockers" — anything broken or unclear
