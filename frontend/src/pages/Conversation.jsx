import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useFlow } from '../context/FlowContext'

export default function Conversation() {
  const { activeTopic, sessionId, setMasterGraph, setChatHistory, setActiveScreen } = useFlow()
  const navigate = useNavigate()
  const [messages, setMessages] = useState([])
  const [inputText, setInputText] = useState('')
  const [turn, setTurn] = useState(1)
  const maxTurns = 5

  // Redirect to home if no topic is set
  useEffect(() => {
    if (!activeTopic) {
      navigate('/')
    } else {
      setMessages([
        {
          sender: 'ai',
          text: `Hello! I'm your Socratic learning assistant. I see you want to learn about "${activeTopic}". Let's start with a simple question: what do you believe is the core mechanism behind it?`
        }
      ])
    }
  }, [activeTopic, navigate])

  const handleSend = (e) => {
    e.preventDefault()
    if (!inputText.trim() || turn > maxTurns) return

    const newMessages = [
      ...messages,
      { sender: 'user', text: inputText }
    ]
    setMessages(newMessages)
    setInputText('')

    // Auto-reply with mock AI message
    if (turn < maxTurns) {
      setTimeout(() => {
        setMessages(prev => [
          ...prev,
          { sender: 'ai', text: `Interesting point. How does that connect to the other components of ${activeTopic}? Can you explain with a quick example?` }
        ])
        setTurn(t => t + 1)
      }, 600)
    } else {
      setTurn(t => t + 1) // Completes the turns
    }
  }

  const handleFinish = () => {
    // Generate mock graph mapping data
    const mockGraph = {
      nodes: [
        { id: '1', label: activeTopic, score: 8.5, status: 'core' },
        { id: '2', label: 'Related Concept A', score: 4.2, status: 'weak' },
        { id: '3', label: 'Related Concept B', score: 9.0, status: 'strong' },
      ],
      edges: [
        { source: '1', target: '2' },
        { source: '1', target: '3' },
      ]
    }
    setMasterGraph(mockGraph)
    setChatHistory(messages)
    setActiveScreen('results')
    navigate('/results')
  }

  if (!activeTopic) return null

  return (
    <div className="max-w-3xl mx-auto flex flex-col h-[500px]">
      {/* Turn indicator */}
      <div className="flex items-center justify-between border-b border-brand-border/40 pb-4 mb-4">
        <div className="text-sm">
          <span className="text-gray-400">Session ID:</span>{' '}
          <span className="font-mono text-gray-300 text-xs">#{sessionId?.slice(0, 8)}</span>
        </div>
        <div className="text-xs uppercase tracking-widest text-brand-purple-light font-semibold bg-brand-purple/10 px-3 py-1 rounded-full border border-brand-purple/20">
          Turn {Math.min(turn, maxTurns)} of {maxTurns}
        </div>
      </div>

      {/* Message List */}
      <div className="flex-grow overflow-y-auto space-y-4 pr-2 mb-4 scrollbar-thin">
        {messages.map((msg, idx) => (
          <div
            key={idx}
            className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm md:text-base leading-relaxed ${
                msg.sender === 'user'
                  ? 'bg-brand-purple text-white rounded-tr-none'
                  : 'bg-brand-dark/80 border border-brand-border/40 text-gray-200 rounded-tl-none'
              }`}
            >
              {msg.text}
            </div>
          </div>
        ))}
        {turn > maxTurns && (
          <div className="flex justify-center py-4">
            <button
              onClick={handleFinish}
              className="py-3 px-6 bg-brand-emerald hover:bg-brand-emerald-light text-white font-bold rounded-xl transition-all duration-200 shadow-glow-emerald active:scale-95 border border-brand-emerald/20 animate-bounce"
            >
              Discover My Blind Spots 💡
            </button>
          </div>
        )}
      </div>

      {/* Input Form */}
      {turn <= maxTurns && (
        <form onSubmit={handleSend} className="flex gap-2">
          <input
            type="text"
            placeholder="Type your response here..."
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            className="flex-grow bg-brand-dark/60 border border-brand-border/60 focus:border-brand-purple rounded-xl px-4 py-3.5 text-white placeholder-gray-500 focus:outline-none transition-all duration-200"
          />
          <button
            type="submit"
            disabled={!inputText.trim()}
            className="py-3.5 px-6 bg-brand-purple hover:bg-brand-purple-light disabled:bg-gray-800 disabled:text-gray-500 disabled:border-gray-700 text-white font-semibold rounded-xl transition-all duration-200 active:scale-95 border border-brand-purple/20"
          >
            Send
          </button>
        </form>
      )}
    </div>
  )
}
