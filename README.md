# BlindSpot 🔦

> You don't know what you don't know. BlindSpot finds it.

BlindSpot is an AI-powered learning tool that finds the gaps in your knowledge you didn't know existed. You tell it what you're learning, have a short conversation with it, and it maps what you actually understand against what an expert knows — then shows you the exact questions you never thought to ask, ranked by how much each one unlocks your understanding.

Most learning tools answer your questions. BlindSpot finds the ones you never knew to ask.

---

## How It Works

1. **Enter a topic** — type anything you're currently learning
2. **Have a conversation** — BlindSpot talks with you naturally, mapping what you know and what you skip
3. **See your blind spots** — a visual knowledge gap map, your top 5 unknown unknowns, and a dependency-ordered learning path

---

## The 4-Agent AI Pipeline

All four agents run on a single Groq API key — different prompts, same model (Llama 3.3 70B).

| Agent | Name | Job |
|-------|------|-----|
| Agent 1 | Expert Knowledge Mapper | Builds a concept dependency graph for any topic |
| Agent 2 | Mental Model Extractor | Runs a multi-turn conversation, scores confidence per concept |
| Agent 3 | Gap Ranker | Diffs expert graph vs user model, ranks gaps by unlock value |
| Agent 4 | Socratic Output | Converts top gaps into questions the user never thought to ask |

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React + Vite + Tailwind CSS + D3.js |
| Backend | Node.js + Express |
| AI | Groq API (Llama-3.3-70b-versatile) |
| Database | Supabase (PostgreSQL) |
| Frontend Host | Vercel |
| Backend Host | Railway |

---

## Project Structure

```
blindspot/
  frontend/        ← React + Vite app
  backend/         ← Node.js + Express server
  agents.md        ← AI orchestration configuration
  tasks.md         ← Development task tracker
  context.md       ← Session context for AI editors
  README.md
```

---

## Built For

Groq x Outskill — AI Builders Hackathon 2026

---

## Status

🚧 Currently in active development
