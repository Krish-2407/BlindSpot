const {
  generateFallbackGraph,
  generateFallbackReply,
  generateFallbackRankedGaps,
  generateFallbackSocratic
} = require('../utils/fallbacks');

describe('Fallback Generators', () => {
  describe('generateFallbackGraph', () => {
    it('should return a valid graph structure for React topic', () => {
      const graph = generateFallbackGraph('React hooks');
      expect(graph).toHaveProperty('nodes');
      expect(graph).toHaveProperty('edges');
      expect(Array.isArray(graph.nodes)).toBe(true);
      expect(Array.isArray(graph.edges)).toBe(true);
      expect(graph.nodes.length).toBeGreaterThanOrEqual(15);
      
      const firstNode = graph.nodes[0];
      expect(firstNode).toHaveProperty('id');
      expect(firstNode).toHaveProperty('label');
      expect(firstNode).toHaveProperty('unlock_score');
      expect(firstNode).toHaveProperty('description');
    });

    it('should return a valid graph structure for generic topic', () => {
      const graph = generateFallbackGraph('Testing concepts');
      expect(graph).toHaveProperty('nodes');
      expect(graph).toHaveProperty('edges');
      expect(graph.nodes.length).toBe(15);
      expect(graph.edges.length).toBe(14);
      
      const firstNode = graph.nodes[0];
      expect(firstNode.id).toContain('testing-concepts');
      expect(firstNode).toHaveProperty('label');
      expect(firstNode).toHaveProperty('unlock_score');
    });
  });

  describe('generateFallbackReply', () => {
    it('should return a valid reply and confidence updates', () => {
      const conceptsList = [
        { id: 'react-basics', label: 'React Basics' },
        { id: 'virtual-dom', label: 'Virtual DOM' }
      ];
      const result = generateFallbackReply('Hello', conceptsList, 0);
      expect(result).toHaveProperty('reply');
      expect(result).toHaveProperty('confidence_updates');
      expect(typeof result.reply).toBe('string');
      expect(Array.isArray(result.confidence_updates)).toBe(true);
      expect(result.confidence_updates.length).toBe(1);
      expect(result.confidence_updates[0]).toHaveProperty('id', 'react-basics');
      expect(result.confidence_updates[0]).toHaveProperty('confidence');
      expect(result.confidence_updates[0]).toHaveProperty('evidence');
    });
  });

  describe('generateFallbackRankedGaps', () => {
    it('should rank gaps and return priority scores', () => {
      const gaps = [
        { id: 'react-basics', label: 'React Basics', unlock_value: 5, confidence: 0.2 },
        { id: 'virtual-dom', label: 'Virtual DOM', unlock_value: 8, confidence: 0.1 }
      ];
      const expertGraph = {
        edges: [
          { from: 'react-basics', to: 'virtual-dom' }
        ]
      };
      const result = generateFallbackRankedGaps(gaps, expertGraph);
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(2);
      
      // Virtual DOM should be ranked first due to higher unlock_value
      expect(result[0].concept).toBe('virtual-dom');
      expect(result[0]).toHaveProperty('priority');
      expect(result[0]).toHaveProperty('why');
      expect(Array.isArray(result[0].downstream)).toBe(true);
    });
  });

  describe('generateFallbackSocratic', () => {
    it('should generate questions and learning path from top gaps', () => {
      const topGaps = [
        { concept: 'react-basics', label: 'React Basics', why: 'Essential', downstream: ['virtual-dom'] }
      ];
      const result = generateFallbackSocratic(topGaps);
      expect(result).toHaveProperty('questions');
      expect(result).toHaveProperty('learning_path');
      expect(Array.isArray(result.questions)).toBe(true);
      expect(Array.isArray(result.learning_path)).toBe(true);
      expect(result.questions[0]).toHaveProperty('order', 1);
      expect(result.questions[0]).toHaveProperty('question');
      expect(result.learning_path[0]).toHaveProperty('unlocks');
      expect(result.learning_path[0].unlocks).toContain('virtual-dom');
    });
  });
});
