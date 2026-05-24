import React, { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useFlow } from '../context/FlowContext'

export default function Results() {
  const { activeTopic, sessionId, masterGraph, resetFlow } = useFlow()
  const navigate = useNavigate()

  useEffect(() => {
    if (!activeTopic) {
      navigate('/')
    }
  }, [activeTopic, navigate])

  const handleReset = () => {
    resetFlow()
    navigate('/')
  }

  if (!activeTopic) return null

  // Mock Socratic Questions
  const mockQuestions = [
    { id: 1, text: `How does standard scoping affect the resolution of stale closures in nested state hooks?`, difficulty: 'Hard' },
    { id: 2, text: `Under what network condition would an unhandled database exception trigger an execution cascade?`, difficulty: 'Medium' },
    { id: 3, text: `Why does the React virtual DOM prioritize key identity checks over index-based traversal in lists?`, difficulty: 'Hard' },
  ]

  return (
    <div className="space-y-8 py-4">
      {/* Title Header */}
      <div className="text-center space-y-3">
        <h1 className="text-3xl md:text-5xl font-extrabold text-white tracking-tight">
          Your Knowledge Gap Map
        </h1>
        <p className="text-gray-400 font-light max-w-2xl mx-auto">
          Here is what you actually understand versus the complete concept path of <span className="font-semibold text-brand-emerald">{activeTopic}</span>.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Knowledge Graph Card Panel */}
        <div className="lg:col-span-2 bg-brand-dark/40 border border-brand-border/60 rounded-2xl p-6 min-h-[350px] flex flex-col justify-between">
          <div>
            <h2 className="text-xl font-bold text-white mb-2">Concept Dependency Network</h2>
            <p className="text-xs text-gray-500 mb-4">
              Graph visualizer placeholder. Nodes indicate topics; line weights indicate prerequisites.
            </p>
          </div>
          
          {/* Mock Graph Placeholder */}
          <div className="flex-grow flex items-center justify-center border border-dashed border-brand-border/50 rounded-xl bg-brand-dark/20 p-8">
            <div className="text-center space-y-2">
              <span className="text-brand-purple text-4xl">📊</span>
              <p className="text-sm font-medium text-gray-300">D3.js Node Graph will render here</p>
              <div className="flex flex-wrap justify-center gap-2 mt-3">
                {masterGraph?.nodes.map((node) => (
                  <span
                    key={node.id}
                    className={`text-xs px-2.5 py-1 rounded-md border ${
                      node.status === 'strong'
                        ? 'bg-brand-emerald/10 text-brand-emerald border-brand-emerald/20 shadow-glow-emerald'
                        : node.status === 'weak'
                        ? 'bg-red-500/10 text-red-400 border-red-500/20'
                        : 'bg-brand-purple/10 text-brand-purple-light border-brand-purple/20 shadow-glow-purple'
                    }`}
                  >
                    {node.label} ({node.score})
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Socratic Questions Panel */}
        <div className="space-y-6">
          <div className="bg-brand-dark/40 border border-brand-border/60 rounded-2xl p-6 space-y-4">
            <h2 className="text-xl font-bold text-white">Recommended Questions</h2>
            <p className="text-xs text-gray-500">
              Top questions you never thought to ask, ranked by conceptual unlock value.
            </p>

            <div className="space-y-3">
              {mockQuestions.map((q) => (
                <div
                  key={q.id}
                  className="bg-brand-card border border-brand-border/40 hover:border-brand-purple/35 rounded-xl p-4 transition-all duration-200"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] uppercase tracking-wider font-semibold text-brand-purple bg-brand-purple/10 px-2 py-0.5 rounded border border-brand-purple/20">
                      Question {q.id}
                    </span>
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded ${
                      q.difficulty === 'Hard' ? 'bg-red-500/10 text-red-400' : 'bg-yellow-500/10 text-yellow-400'
                    }`}>
                      {q.difficulty}
                    </span>
                  </div>
                  <p className="text-xs text-gray-300 font-light leading-relaxed">{q.text}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Action Footer */}
      <div className="flex justify-center pt-4">
        <button
          onClick={handleReset}
          className="py-3.5 px-8 bg-brand-purple hover:bg-brand-purple-light text-white font-semibold rounded-xl transition-all duration-200 hover:shadow-glow-purple active:scale-95 border border-brand-purple/20"
        >
          Start New Assessment 🔄
        </button>
      </div>
    </div>
  )
}
