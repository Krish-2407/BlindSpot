# Phase 5: Token & Performance Optimization - Context

**Gathered:** 2026-05-31
**Status:** Ready for planning

<domain>
## Phase Boundary
This phase implements the Hybrid Model Routing configuration and API parameter constraints across the 4-agent backend endpoints to reduce Llama-3.3-70b-versatile token consumption and latency.
</domain>

<decisions>
## Implementation Decisions
- **Agent 1 (Expert Graph)**: Keep on `llama-3.3-70b-versatile` (no changes).
- **Agent 2 (Socratic Chat)**: Keep on `llama-3.3-70b-versatile`, but add `max_tokens: 100` constraints on responses.
- **Agent 3 (Gap Ranker)**: Move to `llama-3.1-8b-instant`.
- **Agent 4 (Socratic Output)**: Keep on `llama-3.3-70b-versatile`, but add `max_tokens: 300` constraints on responses.
</decisions>

<canonical_refs>
## Canonical References
- [agent2.js](file:///d:/Web/BlindSpot/backend/routes/agent2.js)
- [agent3.js](file:///d:/Web/BlindSpot/backend/routes/agent3.js)
- [agent4.js](file:///d:/Web/BlindSpot/backend/routes/agent4.js)
</canonical_refs>

<specifics>
## Specific Ideas
Ensure that changing Agent 3 to Llama 3.1 8B does not break its JSON parsing or fallback handlers.
</specifics>
