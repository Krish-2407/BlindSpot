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
**Phase:** Phase 4 — Polish and Deploy (In Progress - Tasks 1, 2, 3 complete)
**Last updated:** Tuesday (Day 4 — Implemented comprehensive loading states, stagger card animations, manual retry error handling, and critical API/Storage bug fixes across all frontend screens)
**Next session goal:** Replace placeholder gap map with a basic D3.js node graph, configure CORS on Express, and deploy staging build.

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
Phase 4 tasks — in order:
1. Replace Screen 3 placeholder gap map with a basic D3.js node graph
2. Configure CORS on Express to allow frontend domains
3. Deploy frontend to Vercel and backend to Railway

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
