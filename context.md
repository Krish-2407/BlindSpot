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
**Phase:** Not started
**Last updated:** Sunday (Day 0 — setup day)
**Next session goal:** Complete Phase 1 — backend foundation

---

## What Is Built So Far
- [ ] Nothing yet — starting fresh

---

## Folder Structure So Far
```
blindspot/               ← root folder (GitHub repo)
  backend/               ← does not exist yet
  frontend/              ← does not exist yet
  agents.md
  tasks.md
  context.md
```

---

## Files That Exist
None yet.

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
Phase 1 tasks — in order:
1. Create backend folder and run npm init
2. Install dependencies
3. Create config/supabase.js
4. Create config/gemini.js
5. Create server.js
6. Create routes/agent1.js
7. Create routes/agent2.js
8. Test both in Postman

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
