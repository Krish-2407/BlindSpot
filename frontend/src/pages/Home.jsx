import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useFlow } from '../context/FlowContext'

export default function Home() {
  const { setActiveTopic, setSessionId, setActiveScreen } = useFlow()
  const [topic, setTopic] = useState('')
  const [explanation, setExplanation] = useState('')
  const navigate = useNavigate()

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!topic.trim()) return

    // Set global context states
    setActiveTopic(topic)
    // Scaffold a temporary session id
    const mockSessionId = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)
    setSessionId(mockSessionId)
    setActiveScreen('conversation')

    // Navigate to conversation route
    navigate('/conversation')
  }

  return (
    <div className="max-w-2xl mx-auto space-y-8 py-4">
      <div className="text-center space-y-3">
        <h1 className="text-3xl md:text-5xl font-extrabold text-white tracking-tight">
          What are you learning?
        </h1>
        <p className="text-gray-400 font-light">
          Type a topic and any background context to start your Socratic exploration.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-2">
          <label htmlFor="topic-input" className="text-sm font-semibold tracking-wider text-brand-purple-light uppercase">
            Topic or Skill
          </label>
          <input
            id="topic-input"
            type="text"
            placeholder="e.g., React Closures, Quantum Computing, Stock Valuation"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            className="w-full bg-brand-dark/60 border border-brand-border/60 hover:border-brand-purple/40 focus:border-brand-purple rounded-xl px-4 py-3.5 text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-brand-purple transition-all duration-200"
            required
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="exp-input" className="text-sm font-semibold tracking-wider text-brand-purple-light uppercase">
            Opening Explanation (Optional)
          </label>
          <textarea
            id="exp-input"
            rows="4"
            placeholder="Briefly explain what you think you understand about this topic. This helps the AI find gaps faster."
            value={explanation}
            onChange={(e) => setExplanation(e.target.value)}
            className="w-full bg-brand-dark/60 border border-brand-border/60 hover:border-brand-purple/40 focus:border-brand-purple rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-brand-purple transition-all duration-200 resize-none"
          />
        </div>

        <button
          type="submit"
          disabled={!topic.trim()}
          className="w-full py-4 px-6 bg-brand-purple hover:bg-brand-purple-light disabled:bg-gray-800 disabled:text-gray-500 disabled:border-gray-700 text-white font-semibold rounded-xl transition-all duration-200 hover:shadow-glow-purple active:scale-[0.98] border border-brand-purple/20 flex items-center justify-center gap-2"
        >
          Begin Exploration 🔦
        </button>
      </form>
    </div>
  )
}
