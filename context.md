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
**Phase:** Phase 2 — Frontend Scaffolding (In Progress)
**Last updated:** Sunday (Day 2 — Frontend scaffolded and Tailwind CSS integrated with premium custom theme)
**Next session goal:** Complete remaining Phase 2 Tasks (Axios, pages, routing)

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
- [x] Cleaned boilerplate code and verified build with 0 compile warnings

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
      App.jsx            ← updated with Tailwind preview
      index.css          ← updated with Tailwind directives & fonts
      main.jsx
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
- `frontend/src/App.jsx`
- `frontend/src/index.css`
- `frontend/src/main.jsx`
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
Phase 2 tasks — in order:
1. Install axios: `npm install axios`
2. Create frontend `.env` file with `VITE_API_URL=http://localhost:3000`
3. Set up React Router and pages folder structure
4. Build Screen 1 — `pages/Home.jsx`
5. Build Screen 2 — `pages/Conversation.jsx`
6. Build Screen 3 — `pages/Results.jsx`
7. Set up React Router with routes: `/`, `/conversation`, `/results`

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
