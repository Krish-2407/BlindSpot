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

function generateFallbackReply(userMessage, conceptsList, turnNumber) {
  const responses = [
    `Could you explain what ${conceptsList[0]?.label || 'the fundamentals'} mean in your own words?`,
    `How does that relate to ${conceptsList[Math.min(2, conceptsList.length - 1)]?.label || 'other concepts'}?`,
    `Why do you think it is designed to work this way?`,
    `What is a common mistake beginners make when working with this?`,
    `How does it connect to ${conceptsList[conceptsList.length - 1]?.label || 'advanced concepts'}?`
  ];
  
  const turnIndex = Math.floor(turnNumber / 2);
  const reply = responses[Math.min(turnIndex, responses.length - 1)] || "Could you clarify that?";

  const updatedConceptIndex = Math.min(turnIndex, conceptsList.length - 1);
  const conceptId = conceptsList[updatedConceptIndex]?.id;

  const confidenceUpdates = [];
  if (conceptId) {
    confidenceUpdates.push({
      id: conceptId,
      confidence: Math.min(1.0, 0.2 + (turnIndex * 0.15)),
      evidence: `Demonstrates basic understanding of ${conceptsList[updatedConceptIndex]?.label} in Socratic dialogue.`
    });
  }

  return {
    reply,
    confidence_updates: confidenceUpdates
  };
}

function generateFallbackRankedGaps(gaps, expertGraph) {
  // Sort gaps by unlock_value descending, then confidence ascending
  const sortedGaps = [...gaps].sort((a, b) => {
    if (b.unlock_value !== a.unlock_value) {
      return b.unlock_value - a.unlock_value;
    }
    const confA = a.confidence === null ? 0 : a.confidence;
    const confB = b.confidence === null ? 0 : b.confidence;
    return confA - confB;
  });

  return sortedGaps.map((gap, index) => {
    const confVal = gap.confidence === null ? 0 : gap.confidence;
    // Calculate priority between 1 and 10
    const priority = Math.min(10, Math.max(1, parseFloat((8.0 + (gap.unlock_value * 0.5) - (confVal * 3) - (index * 0.5)).toFixed(1))));
    
    // Find downstream concept ids
    const downstream = (expertGraph.edges || [])
      .filter(edge => edge.from === gap.id)
      .map(edge => edge.to);

    return {
      concept: gap.id,
      label: gap.label,
      priority: priority,
      why: `This concept is essential to unlock ${downstream.length > 0 ? downstream.join(', ') : 'more advanced topics'} and requires further practice.`,
      downstream: downstream
    };
  });
}

function generateFallbackSocratic(topGaps) {
  const questionTemplates = [
    (label) => `How would you explain the core mechanism behind ${label} to a developer who has never used it?`,
    (label) => `What is the primary design problem that ${label} solves, and how does it prevent bugs?`,
    (label) => `If you had to build a simple version of ${label} from scratch, what would your first step be?`,
    (label) => `Why does ${label} require careful reference stability, and what happens if it gets re-created on every render?`,
    (label) => `What common pitfalls or edge cases do developers encounter when working with ${label} in production?`
  ];

  const questions = topGaps.map((gap, index) => {
    const template = questionTemplates[index % questionTemplates.length];
    return {
      order: index + 1,
      concept: gap.concept,
      label: gap.label,
      question: template(gap.label),
      why_this_matters: gap.why || `Understanding ${gap.label} is crucial for managing application state and logic.`
    };
  });

  const learningPath = topGaps.map((gap, index) => {
    return {
      order: index + 1,
      concept: gap.concept,
      label: gap.label,
      unlocks: gap.downstream && gap.downstream.length > 0 
        ? gap.downstream 
        : [`Advanced ${gap.label} patterns`]
    };
  });

  return { questions, learning_path: learningPath };
}

module.exports = {
  generateFallbackGraph,
  generateFallbackReply,
  generateFallbackRankedGaps,
  generateFallbackSocratic
};
