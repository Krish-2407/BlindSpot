const express = require('express');
const router = express.Router();
const supabase = require('../config/supabase');
const groq = require('../config/groq');
const { recordAgentEvent, normalizeError } = require('../utils/agentTrace');

function generateFallbackGraph(topic) {
  const cleanedTopic = (topic || 'Concepts').trim();
  const baseId = cleanedTopic.toLowerCase().replace(/[^a-z0-9]+/g, '-');

  if (cleanedTopic.toLowerCase().includes('react')) {
    return {
      nodes: [
        { id: "react-basics", label: "React Basics", unlock_score: 9.8, description: "Understanding components, elements, and JSX." },
        { id: "virtual-dom", label: "Virtual DOM", unlock_score: 9.0, description: "How React renders and syncs changes efficiently." },
        { id: "props-state", label: "Props & State", unlock_score: 8.5, description: "Managing data flow and component level data." },
        { id: "closures", label: "Closures in React", unlock_score: 8.2, description: "Lexical scope and retaining values across renders." },
        { id: "hooks-intro", label: "Introduction to Hooks", unlock_score: 8.0, description: "Using state and side effects in functional components." },
        { id: "usestate", label: "useState Hook", unlock_score: 7.8, description: "Declaring and updating local state dynamically." },
        { id: "useeffect", label: "useEffect Hook", unlock_score: 7.5, description: "Handling side-effects, subscriptions, and cleanups." },
        { id: "stale-closures", label: "Stale Closures", unlock_score: 7.0, description: "When a hook captures old variables from a past render." },
        { id: "usememo-usecallback", label: "useMemo & useCallback", unlock_score: 6.5, description: "Optimizing render performance and reference stability." },
        { id: "useref", label: "useRef Hook", unlock_score: 6.0, description: "Accessing DOM nodes and storing mutable values." },
        { id: "context-api", label: "Context API", unlock_score: 5.5, description: "Passing data deeply without manual prop drilling." },
        { id: "custom-hooks", label: "Custom Hooks", unlock_score: 5.0, description: "Extracting component logic into reusable functions." },
        { id: "concurrent-rendering", label: "Concurrent Rendering", unlock_score: 4.0, description: "Understanding transitions and deferred updates." },
        { id: "suspense-ssr", label: "Suspense & SSR", unlock_score: 3.5, description: "Handling async loading and server side rendering." },
        { id: "react-compiler", label: "React Compiler", unlock_score: 2.0, description: "Automatic memoization and future React internals." }
      ],
      edges: [
        { from: "react-basics", to: "virtual-dom" },
        { from: "virtual-dom", to: "props-state" },
        { from: "props-state", to: "hooks-intro" },
        { from: "closures", to: "stale-closures" },
        { from: "hooks-intro", to: "usestate" },
        { from: "hooks-intro", to: "useeffect" },
        { from: "usestate", to: "stale-closures" },
        { from: "useeffect", to: "stale-closures" },
        { from: "stale-closures", to: "usememo-usecallback" },
        { from: "usememo-usecallback", to: "useref" },
        { from: "props-state", to: "context-api" },
        { from: "usestate", to: "custom-hooks" },
        { from: "usememo-usecallback", to: "concurrent-rendering" },
        { from: "concurrent-rendering", to: "suspense-ssr" },
        { from: "suspense-ssr", to: "react-compiler" }
      ]
    };
  }

  if (cleanedTopic.toLowerCase().includes('git')) {
    return {
      nodes: [
        { id: "vcs-basics", label: "VCS Basics", unlock_score: 9.8, description: "Understanding centralized vs distributed version control." },
        { id: "git-init", label: "Git Repository Init", unlock_score: 9.0, description: "Creating repositories and tracking directory changes." },
        { id: "three-states", label: "The Three States", unlock_score: 8.8, description: "Working Directory, Staging Area, and Git Directory." },
        { id: "git-commit", label: "Commits & Content", unlock_score: 8.5, description: "How snapshots are recorded into the database." },
        { id: "git-objects", label: "Git Objects (Blobs/Trees)", unlock_score: 8.0, description: "DAG internals, hash-addressed storage, and content keys." },
        { id: "git-refs", label: "Git References", unlock_score: 7.5, description: "Branches, tags, and HEAD pointer file structures." },
        { id: "git-branching", label: "Branching Internals", unlock_score: 7.0, description: "Lightweight pointers moving between commit objects." },
        { id: "git-merging", label: "Merging & Fast-Forwards", unlock_score: 6.5, description: "Combining histories and solving merge conflicts." },
        { id: "git-rebasing", label: "Rebasing & Commits History", unlock_score: 6.0, description: "Rewriting history and linear project trails." },
        { id: "git-remotes", label: "Remotes & Fetching", unlock_score: 5.5, description: "Syncing data with remote hosts like GitHub." },
        { id: "git-reset", label: "Git Reset (Soft/Mixed/Hard)", unlock_score: 5.0, description: "Moving branch pointers and staging modifications." },
        { id: "git-cherry-pick", label: "Cherry-Picking", unlock_score: 4.5, description: "Applying specific commit patches to active HEAD." },
        { id: "git-reflog", label: "Reflog & Recovery", unlock_score: 4.0, description: "Tracking HEAD movements to recover lost branches." },
        { id: "git-hooks", label: "Git Hooks", unlock_score: 3.0, description: "Automating scripts during commits and merges." },
        { id: "git-internals-packfiles", label: "Packfiles & Garbage Collection", unlock_score: 2.0, description: "Compressed delta streams and object storage optimization." }
      ],
      edges: [
        { from: "vcs-basics", to: "git-init" },
        { from: "git-init", to: "three-states" },
        { from: "three-states", to: "git-commit" },
        { from: "git-commit", to: "git-objects" },
        { from: "git-objects", to: "git-refs" },
        { from: "git-refs", to: "git-branching" },
        { from: "git-branching", to: "git-merging" },
        { from: "git-merging", to: "git-rebasing" },
        { from: "git-branching", to: "git-remotes" },
        { from: "git-commit", to: "git-reset" },
        { from: "git-commit", to: "git-cherry-pick" },
        { from: "git-refs", to: "git-reflog" },
        { from: "git-commit", to: "git-hooks" },
        { from: "git-objects", to: "git-internals-packfiles" }
      ]
    };
  }

  return {
    nodes: [
      { id: `${baseId}-fundamentals`, label: `${cleanedTopic} Fundamentals`, unlock_score: 9.5, description: `Foundational principles and building blocks of ${cleanedTopic}.` },
      { id: `${baseId}-core-syntax`, label: `Core Syntax & Rules`, unlock_score: 9.0, description: `Key syntax, notations, and structures used in ${cleanedTopic}.` },
      { id: `${baseId}-basic-patterns`, label: `Basic Patterns`, unlock_score: 8.5, description: `Standard procedures and structures to implement basic tasks.` },
      { id: `${baseId}-execution-context`, label: `Execution Context`, unlock_score: 8.0, description: `How code or logic runs inside the ${cleanedTopic} runtime.` },
      { id: `${baseId}-state-management`, label: `State Management`, unlock_score: 7.5, description: `Handling internal state, variables, or configs over time.` },
      { id: `${baseId}-data-handling`, label: `Data Flows & Types`, unlock_score: 7.0, description: `Input and output processing pipelines in ${cleanedTopic}.` },
      { id: `${baseId}-lifecycle`, label: `Lifecycle Mechanics`, unlock_score: 6.5, description: `Creation, updates, and destruction routines.` },
      { id: `${baseId}-performance-tuning`, label: `Performance Tuning`, unlock_score: 6.0, description: `Optimizing computation and efficiency of ${cleanedTopic} patterns.` },
      { id: `${baseId}-error-handling`, label: `Error & Exception Handling`, unlock_score: 5.5, description: `Catching, logging, and recovering from failures.` },
      { id: `${baseId}-security`, label: `Security & Vulnerabilities`, unlock_score: 5.0, description: `Best practices to prevent breaches and safeguard data.` },
      { id: `${baseId}-testing-debug`, label: `Testing & Debugging`, unlock_score: 4.5, description: `Validating logic and finding bugs efficiently.` },
      { id: `${baseId}-scale-strategies`, label: `Scaling Strategies`, unlock_score: 4.0, description: `Adapting local codebases to large-scale distributed setups.` },
      { id: `${baseId}-advanced-arch`, label: `Advanced Architecture`, unlock_score: 3.5, description: `Deep design systems and abstractions in ${cleanedTopic}.` },
      { id: `${baseId}-ecosystem`, label: `Ecosystem & Integration`, unlock_score: 3.0, description: `Popular packages, plugins, and third-party tools.` },
      { id: `${baseId}-design-patterns`, label: `Design Patterns & Paradigms`, unlock_score: 2.0, description: `Revisiting master architectural styles for complex builds.` }
    ],
    edges: [
      { from: `${baseId}-fundamentals`, to: `${baseId}-core-syntax` },
      { from: `${baseId}-core-syntax`, to: `${baseId}-basic-patterns` },
      { from: `${baseId}-basic-patterns`, to: `${baseId}-execution-context` },
      { from: `${baseId}-execution-context`, to: `${baseId}-state-management` },
      { from: `${baseId}-state-management`, to: `${baseId}-data-handling` },
      { from: `${baseId}-data-handling`, to: `${baseId}-lifecycle` },
      { from: `${baseId}-lifecycle`, to: `${baseId}-performance-tuning` },
      { from: `${baseId}-performance-tuning`, to: `${baseId}-error-handling` },
      { from: `${baseId}-error-handling`, to: `${baseId}-security` },
      { from: `${baseId}-security`, to: `${baseId}-testing-debug` },
      { from: `${baseId}-testing-debug`, to: `${baseId}-scale-strategies` },
      { from: `${baseId}-scale-strategies`, to: `${baseId}-advanced-arch` },
      { from: `${baseId}-advanced-arch`, to: `${baseId}-ecosystem` },
      { from: `${baseId}-ecosystem`, to: `${baseId}-design-patterns` }
    ]
  };
}

function sanitizeInput(text) {
  if (!text || typeof text !== 'string') return '';
  return text
    .replace(/[\[\]\{\}\\]/g, '')
    .replace(/ignore\s+(?:previous|above|system|all)\s+instructions/gi, '')
    .replace(/ignore\s+instructions/gi, '')
    .trim();
}

router.post('/', async (req, res) => {
  try {
    let { topic, openingExplanation } = req.body;

    // Sanitize input to mitigate prompt injection
    topic = sanitizeInput(topic);
    openingExplanation = sanitizeInput(openingExplanation);

    // 1. Validate request body fields
    if (!topic || typeof topic !== 'string' || !topic.trim()) {
      return res.status(400).json({ error: 'Missing or invalid required field: topic' });
    }
    if (topic.length > 500) {
      return res.status(400).json({ error: 'Topic too long. Maximum 500 characters.' });
    }
    if (openingExplanation && openingExplanation.length > 10000) {
      return res.status(400).json({ error: 'Opening explanation too long. Maximum 10,000 characters.' });
    }

    recordAgentEvent('agent1', 'request_received', {
      topic: topic.trim(),
      openingExplanation: openingExplanation || ''
    });

    // 2. Prepare Groq Prompt
    const explanationContext = openingExplanation && openingExplanation.trim()
      ? `\nThe learner provided this self-assessment of their current knowledge:\n"${openingExplanation.trim()}"\nUse this to emphasize concepts they seem weak on and include concepts they may be overconfident about.\n`
      : '';

    const prompt = `You are an expert educator and knowledge graph builder.
Generate a comprehensive concept dependency graph for 
the topic: ${topic}
${explanationContext}
You MUST generate between 15 and 25 concept nodes.
This is mandatory. Do not generate fewer than 15 nodes.

Think about everything a true expert in ${topic} would know:
- Foundational basics
- Core concepts
- Intermediate patterns
- Advanced topics
- Common pitfalls and edge cases

CRITICAL LANGUAGE CONSTRAINT: Even if the topic or learner self-assessment is written in Hindi (in Devanagari script) or is a mix of Hindi and English (Hinglish), you MUST output all JSON values (node labels, descriptions, IDs) exclusively in English. Translate any Hindi terms to standard English.

Return ONLY valid JSON. No markdown. No backticks. 
No explanation. Start directly with { and end with }

Use exactly this structure:
{
  "nodes": [
    {
      "id": lowercase_underscore_string,
      "label": Human Readable Name,
      "description": one sentence what this concept is,
      "unlock_score": number between 1 and 10,
      "depth": 1 for basic, 2 for intermediate, 3 for advanced
    }
  ],
  "edges": [
    {
      "from": concept_id_that_must_be_learned_first,
      "to": concept_id_that_depends_on_it
    }
  ]
}

Example for topic JavaScript:
{
  "nodes": [
    { "id": "variables", "label": "Variables & Data Types", "description": "Storing and typing data in JS", "unlock_score": 9, "depth": 1 },
    { "id": "functions", "label": "Functions", "description": "Reusable blocks of logic", "unlock_score": 8, "depth": 1 },
    { "id": "closures", "label": "Closures", "description": "Functions retaining outer scope", "unlock_score": 7, "depth": 2 }
  ],
  "edges": [
    { "from": "variables", "to": "functions" },
    { "from": "functions", "to": "closures" }
  ]
}

Now generate the full graph for: ${topic}
Remember: minimum 15 nodes, maximum 25 nodes.`;

    let expertGraph;
    try {
      // 3. Call Groq API
      recordAgentEvent('agent1', 'groq_request', {
        provider: 'groq',
        model: 'llama-3.3-70b-versatile',
        topic: topic.trim()
      });

      const chatCompletion = await groq.chat.completions.create({
        model: "llama-3.3-70b-versatile",
        response_format: { type: "json_object" },
        messages: [{ role: "user", content: prompt }]
      });
      let rawText = chatCompletion.choices[0].message.content.trim();

      // Remove markdown code fence wrappers if present
      if (rawText.startsWith('```')) {
        rawText = rawText.replace(/^```json\s*/i, '').replace(/```$/, '').trim();
      }

      // Step 1: Parse
      const parsedGraph = JSON.parse(rawText);

      console.log('Agent 1 - topic received:', topic);
      console.log('Agent 1 - raw Groq response:', rawText);
      console.log('Agent 1 - parsed nodes count:', parsedGraph?.nodes?.length);
      console.log('Agent 1 - parsed edges count:', parsedGraph?.edges?.length);

      recordAgentEvent('agent1', 'groq_response_parsed', {
        topic: topic.trim(),
        nodesCount: parsedGraph?.nodes?.length || 0,
        edgesCount: parsedGraph?.edges?.length || 0,
        rawResponse: rawText,
        parsedGraph
      });

      // Step 3 - Validation
      if (!parsedGraph.nodes || parsedGraph.nodes.length < 5) {
        console.error('Agent 1 - Too few nodes generated:', parsedGraph.nodes?.length);
        return res.status(500).json({ 
          error: 'Failed to generate proper knowledge graph. Please try again.' 
        });
      }

      expertGraph = parsedGraph;
    } catch (apiError) {
      console.warn('Groq API call failed or rate-limited. Falling back to dynamic mock graph. Error:', apiError.message);
      expertGraph = generateFallbackGraph(topic);
      recordAgentEvent('agent1', 'fallback_used', {
        topic: topic.trim(),
        reason: normalizeError(apiError),
        fallbackGraph: expertGraph
      });
    }

    // 5. Save parsed output to Supabase sessions table
    // Embed the opening explanation into the expertGraph payload so we don't
    // require an immediate DB schema migration for a new column.
    const graphToSave = Object.assign({}, expertGraph, {
      opening_explanation: openingExplanation || ''
    });

    const { data, error } = await supabase
      .from('sessions')
      .insert([
        {
          topic: topic.trim(),
          expert_graph: graphToSave
        }
      ])
      .select();

    if (error) {
      console.error('Supabase insert error:', error);
      return res.status(500).json({ error: 'Failed to save session to database', details: error.message });
    }

    if (!data || data.length === 0) {
      return res.status(500).json({ error: 'No data returned from database insert' });
    }

    const sessionId = data[0].id;

    recordAgentEvent('agent1', 'session_saved', {
      sessionId,
      topic: topic.trim(),
      graphSource: expertGraph?.nodes?.some(node => String(node.id || '').includes(`${topic.trim().toLowerCase()}-core-syntax`))
        ? 'fallback_or_generic'
        : 'model_or_custom',
      nodesCount: expertGraph?.nodes?.length || 0,
      edgesCount: expertGraph?.edges?.length || 0
    });

    // 6. Return response conforming to API contract
    return res.status(200).json({
      sessionId,
      expertGraph
    });

  } catch (error) {
    console.error('Agent 1 Error:', error)
    res.status(500).json({ 
      error: 'Internal server error in Expert Knowledge Mapper'
    })
  }
});

module.exports = router;
