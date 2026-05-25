import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useFlow } from '../context/FlowContext'
import axios from 'axios'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000'

export default function Home() {
  const { setActiveTopic, setSessionId, setMasterGraph, setChatHistory, setActiveScreen } = useFlow()
  const [topic, setTopic] = useState('')
  const [explanation, setExplanation] = useState('')
  const [loading, setLoading] = useState(false)
  const [loadingStep, setLoadingStep] = useState('') // "mapping" or "diagnosing"
  const [error, setError] = useState('')
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!topic.trim()) return

    setLoading(true)
    setError('')
    setLoadingStep('mapping')

    try {
      // Clear any prior chat history first
      setChatHistory([])

      // Call Agent 1 to build the concept dependency graph
      const response = await axios.post(`${API_URL}/api/agent1`, {
        topic: topic.trim(),
        openingExplanation: explanation.trim()
      })

      const { sessionId, expertGraph } = response.data
      
      // Capture expertGraph regardless of casing format from backend
      const graphData = expertGraph || response.data.expert_graph

      setSessionId(sessionId)
      setActiveTopic(topic.trim())
      setMasterGraph(graphData)

      setActiveScreen('conversation')
      navigate('/conversation')
    } catch (err) {
      console.error(err)
      setError(err.response?.data?.error || 'An error occurred during session initialization. Please make sure the backend is running.')
    } finally {
      setLoading(false)
      setLoadingStep('')
    }
  }

  return (
    <div className="h-screen max-h-screen relative flex flex-col items-center justify-between overflow-hidden p-4 md:p-6 bg-[#020617]">
      {/* CSS Styles for animations & effects */}
      <style dangerouslySetInnerHTML={{ __html: `
        /* 30-40% Increased Orbit Radius Translations */
        @keyframes orbit1 { from { transform: rotate(0deg) translateX(250px) rotate(0deg); } to { transform: rotate(360deg) translateX(250px) rotate(-360deg); } }
        @keyframes orbit2 { from { transform: rotate(45deg) translateX(380px) rotate(-45deg); } to { transform: rotate(405deg) translateX(380px) rotate(-405deg); } }
        @keyframes orbit3 { from { transform: rotate(120deg) translateX(500px) rotate(-120deg); } to { transform: rotate(480deg) translateX(500px) rotate(-480deg); } }
        @keyframes orbit4 { from { transform: rotate(200deg) translateX(620px) rotate(-200deg); } to { transform: rotate(560deg) translateX(620px) rotate(-560deg); } }
        @keyframes orbit5 { from { transform: rotate(280deg) translateX(740px) rotate(-280deg); } to { transform: rotate(640deg) translateX(740px) rotate(-640deg); } }
        
        @keyframes twinkle { 0%, 100% { opacity: 0.2; transform: scale(0.8); } 50% { opacity: 0.8; transform: scale(1.2); } }
        @keyframes breathe-glow { 0%, 100% { opacity: 0.25; transform: translate(-50%, -50%) scale(1); } 50% { opacity: 0.45; transform: translate(-50%, -50%) scale(1.03); } }
        @keyframes node-pulse { 0%, 100% { transform: scale(1); filter: brightness(1); } 50% { transform: scale(1.04); filter: brightness(1.1); } }
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
        .shimmer-bg {
          position: absolute;
          inset: 0;
          background: linear-gradient(90deg, transparent, rgba(139, 92, 246, 0.15), transparent);
          transform: translateX(-100%);
          animation: shimmer 1.6s infinite linear;
        }
        
        /* 80% Animation Speed Reduction (Smooth, Slow, Eased motion) */
        .orbit-node-1 { animation: orbit1 150s ease-in-out infinite; }
        .orbit-node-2 { animation: orbit2 200s ease-in-out infinite reverse; }
        .orbit-node-3 { animation: orbit3 250s ease-in-out infinite; }
        .orbit-node-4 { animation: orbit4 300s ease-in-out infinite reverse; }
        .orbit-node-5 { animation: orbit5 225s ease-in-out infinite; }
        .star { animation: twinkle 3s ease-in-out infinite; }
        .center-bleed-glow { animation: breathe-glow 8s ease-in-out infinite; }
        
        .glass-input {
          background: rgba(20, 14, 40, 0.5);
          border: 1px solid rgba(139, 92, 246, 0.15);
          transition: all 0.2s ease;
        }
        .glass-input:focus-within {
          border-color: rgba(139, 92, 246, 0.45);
          box-shadow: 0 0 12px rgba(139, 92, 246, 0.15);
        }
        
        /* Vivid Node Styles with Inset Gradients, High-Saturation Colors, and Soft Blurry Glows */
        .node-green { 
          box-shadow: 0 0 35px rgba(16, 185, 129, 0.75), inset 0 0 12px rgba(255, 255, 255, 0.3); 
          background: radial-gradient(circle at 30% 30%, rgba(52, 211, 153, 1), rgba(16, 185, 129, 0.95), rgba(6, 78, 59, 1)); 
          border: 1.5px solid rgba(52, 211, 153, 0.8);
          animation: node-pulse 4s ease-in-out infinite;
        }
        .node-purple { 
          box-shadow: 0 0 35px rgba(139, 92, 246, 0.75), inset 0 0 12px rgba(255, 255, 255, 0.3); 
          background: radial-gradient(circle at 30% 30%, rgba(192, 132, 252, 1), rgba(139, 92, 246, 0.95), rgba(88, 28, 135, 1)); 
          border: 1.5px solid rgba(192, 132, 252, 0.8);
          animation: node-pulse 5s ease-in-out infinite;
        }
        .node-yellow { 
          box-shadow: 0 0 40px rgba(245, 158, 11, 0.85), inset 0 0 12px rgba(255, 255, 255, 0.4); 
          background: radial-gradient(circle at 30% 30%, rgba(253, 224, 71, 1), rgba(245, 158, 11, 0.95), rgba(146, 64, 14, 1)); 
          border: 1.5px solid rgba(253, 224, 71, 0.9);
          animation: node-pulse 3s ease-in-out infinite;
        }
      `}} />

      {/* Background layer */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
        <div className="center-bleed-glow absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] bg-brand-purple/5 rounded-full blur-[140px]"></div>
        <svg className="absolute inset-0 w-full h-full opacity-30" preserveAspectRatio="xMidYMid slice" viewBox="0 0 1600 1000">
          <circle className="star" cx="10%" cy="20%" fill="#fff" r="1"></circle>
          <circle className="star animate-pulse" cx="25%" cy="80%" fill="#8b5cf6" r="1.5"></circle>
          <circle className="star" cx="40%" cy="10%" fill="#fff" r="2"></circle>
          <circle className="star" cx="60%" cy="90%" fill="#10b981" r="1"></circle>
          <circle className="star animate-pulse" cx="85%" cy="30%" fill="#fff" r="1.5"></circle>
          <circle className="star" cx="90%" cy="70%" fill="#8b5cf6" r="2"></circle>
          <circle className="star" cx="50%" cy="5%" fill="#fff" r="1"></circle>
          <circle className="star" cx="15%" cy="50%" fill="#f59e0b" r="1.5"></circle>
        </svg>
      </div>

      {/* Orbit Rings Layer (High-visibility, glow-enhanced rings) */}
      <div className="absolute inset-0 pointer-events-none z-10 flex items-center justify-center">
        <div className="relative w-[1500px] h-[1500px] flex items-center justify-center scale-90 md:scale-100">
          {/* Rings */}
          <div className="absolute w-[500px] h-[500px] rounded-full border-2 border-brand-purple/20 shadow-[0_0_15px_rgba(139,92,246,0.06)]"></div>
          <div className="absolute w-[760px] h-[760px] rounded-full border-2 border-brand-emerald/15 shadow-[0_0_15px_rgba(16,185,129,0.04)]"></div>
          <div className="absolute w-[1000px] h-[1000px] rounded-full border-2 border-brand-purple/20 shadow-[0_0_20px_rgba(139,92,246,0.06)]"></div>
          <div className="absolute w-[1240px] h-[1240px] rounded-full border-2 border-brand-accent/15 shadow-[0_0_20px_rgba(192,132,252,0.04)]"></div>
          <div className="absolute w-[1480px] h-[1480px] rounded-full border-2 border-brand-purple/10 shadow-[0_0_25px_rgba(139,92,246,0.04)]"></div>

          {/* Nodes moving on orbits */}
          <div className="absolute orbit-node-1 flex flex-col items-center gap-1.5 z-20">
            <div className="w-9 h-9 rounded-full flex items-center justify-center node-green">
              <i className="fa-solid fa-graduation-cap text-white text-xs"></i>
            </div>
            <span className="text-[11px] font-bold text-green-200/90 whitespace-nowrap">Core Concepts</span>
          </div>

          <div className="absolute orbit-node-2 flex flex-col items-center gap-1.5 z-10">
            <div className="w-8 h-8 rounded-full flex items-center justify-center node-purple">
              <i className="fa-solid fa-code text-white text-xs"></i>
            </div>
            <span className="text-[11px] font-bold text-purple-200/90 whitespace-nowrap">Fundamentals</span>
          </div>

          <div className="absolute orbit-node-3 flex flex-col items-center gap-1.5 z-10">
            <div className="w-8 h-8 rounded-full flex items-center justify-center node-green">
              <i className="fa-solid fa-circle-check text-white text-xs"></i>
            </div>
            <span className="text-[11px] font-bold text-green-200/90 whitespace-nowrap">Best Practices</span>
          </div>

          <div className="absolute orbit-node-4 flex flex-col items-center gap-1.5 z-30">
            <div className="w-11 h-11 rounded-full flex items-center justify-center node-yellow relative">
              <div className="absolute inset-0 bg-yellow-400/20 rounded-full animate-ping opacity-25"></div>
              <i className="fa-solid fa-triangle-exclamation text-white text-sm z-10"></i>
            </div>
            <span className="text-[12px] font-black text-yellow-300 whitespace-nowrap">Blind Spots</span>
          </div>

          <div className="absolute orbit-node-5 flex flex-col items-center gap-1.5 z-10">
            <div className="w-8 h-8 rounded-full flex items-center justify-center node-purple">
              <i className="fa-solid fa-chart-line text-white text-xs"></i>
            </div>
            <span className="text-[11px] font-bold text-purple-200/90 whitespace-nowrap">Applications</span>
          </div>
        </div>
      </div>

      {/* Header */}
      <header className="w-full flex justify-between items-center px-8 py-3.5 z-20">
        <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate('/')}>
          <div className="w-7 h-7 rounded-full bg-brand-purple flex items-center justify-center shadow-glow-purple">
            <i className="fa-solid fa-eye text-white text-xs"></i>
          </div>
          <span className="text-xl font-extrabold tracking-tight text-white">BlindSpot</span>
        </div>
        <nav className="hidden md:flex items-center gap-5 bg-brand-card/40 backdrop-blur-md border border-brand-border/30 rounded-full px-5 py-2">
          <div className="flex items-center gap-1.5">
            <span className="bg-gradient-to-br from-brand-purple to-indigo-600 text-white w-4.5 h-4.5 rounded-full flex items-center justify-center text-[10px] font-bold">1</span>
            <span className="text-xs md:text-sm font-bold text-white">Define Topic</span>
          </div>
          <i className="fa-solid fa-arrow-right text-[9px] text-gray-500"></i>
          <div className="flex items-center gap-1.5 opacity-55">
            <span className="bg-gray-800 text-gray-400 w-4.5 h-4.5 rounded-full flex items-center justify-center text-[10px] font-bold">2</span>
            <span className="text-xs md:text-sm font-bold text-gray-400">Socratic Chat</span>
          </div>
          <i className="fa-solid fa-arrow-right text-[9px] text-gray-500"></i>
          <div className="flex items-center gap-1.5 opacity-55">
            <span className="bg-gray-800 text-gray-400 w-4.5 h-4.5 rounded-full flex items-center justify-center text-[10px] font-bold">3</span>
            <span className="text-xs md:text-sm font-bold text-gray-400">Results Map</span>
          </div>
        </nav>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full border border-brand-purple/20 bg-brand-card flex items-center justify-center text-sm font-bold text-brand-purple-light">
            BS
          </div>
        </div>
      </header>

      {/* Main Content Container (Vertical alignment helper) */}
      <main className="w-full flex-grow flex flex-col items-center justify-center px-4 py-2 z-20">
        <div className="relative z-40 flex flex-col items-center w-full max-w-[500px]">
          
          {/* Badge */}
          <div className="flex items-center gap-1.5 border border-brand-purple/25 bg-brand-purple/10 rounded-full px-4 py-1.5 mb-3.5 backdrop-blur-md">
            <i className="fa-solid fa-wand-magic-sparkles text-brand-purple-light text-xs animate-pulse"></i>
            <span className="text-[10px] font-bold text-brand-purple-light tracking-wider uppercase">Socratic Knowledge Evaluator</span>
          </div>

          {/* Headlines (Increased Font Sizes) */}
          <h1 className="text-4xl md:text-5xl font-extrabold mb-3 text-center tracking-tight text-white leading-tight">
            What are you <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-purple-light via-brand-accent to-brand-purple">learning?</span>
          </h1>
          <p className="text-gray-300 text-center text-sm md:text-base mb-6 max-w-[460px] leading-relaxed">
            Input your topic to start a short conversation with our AI tutor, mapping your concept understanding in real-time.
          </p>

          {/* Form Card */}
          <form onSubmit={handleSubmit} className="w-full bg-brand-card/70 backdrop-blur-xl border border-brand-border/50 rounded-2xl p-5 md:p-6 shadow-[0_0_60px_rgba(139,92,246,0.1)] relative z-10 flex flex-col gap-4">
            
            {/* Error Message */}
            {error && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 text-[11px] text-red-400 flex items-start gap-2">
                <i className="fa-solid fa-triangle-exclamation mt-0.5"></i>
                <p>{error}</p>
              </div>
            )}

            {/* Topic Input */}
            <div>
              <label className="block text-[12px] font-bold text-gray-300 uppercase tracking-widest mb-1.5 ml-0.5">Topic</label>
              <div className="relative glass-input rounded-xl flex items-center p-1">
                <div className="pl-3 pr-2 text-gray-500">
                  <i className="fa-solid fa-magnifying-glass text-xs"></i>
                </div>
                <input 
                  type="text"
                  required
                  disabled={loading}
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  placeholder="e.g., React Closures, Git Internals, CSS Grid..." 
                  className="w-full bg-transparent border-none text-white placeholder-gray-500 focus:ring-0 text-sm py-2 px-1 focus:outline-none"
                />
              </div>
            </div>

            {/* Explanation Input */}
            <div>
              <div className="flex justify-between items-center mb-1.5 ml-0.5">
                <label className="block text-[12px] font-bold text-gray-300 uppercase tracking-widest">Opening Explanation (Optional)</label>
                <span className="text-[10px] text-gray-500">{explanation.length} / 1000</span>
              </div>
              <div className="relative glass-input rounded-xl p-1">
                <textarea 
                  rows="3"
                  maxLength={1000}
                  disabled={loading}
                  value={explanation}
                  onChange={(e) => setExplanation(e.target.value)}
                  placeholder="Explain what you think you understand. This helps the AI customize diagnostic Socratic questions faster." 
                  className="w-full bg-transparent border-none text-white placeholder-gray-500 focus:ring-0 text-sm resize-none p-1.5 leading-relaxed focus:outline-none"
                />
              </div>
            </div>

            {/* Actions/Submit inside form for tighter alignment */}
            {loading ? (
              <div className="relative overflow-hidden w-full h-[52px] rounded-xl bg-[#0b0e1a]/80 border border-brand-purple/20 flex items-center justify-center gap-2.5 shadow-[0_0_20px_rgba(139,92,246,0.1)] mt-1">
                <div className="shimmer-bg"></div>
                <div className="w-4 h-4 rounded-full border-2 border-brand-purple-light/20 border-t-brand-purple-light animate-spin z-10"></div>
                <span className="text-xs font-bold text-brand-purple-light uppercase tracking-wider animate-pulse z-10">
                  Mapping Topic Graph...
                </span>
              </div>
            ) : (
              <div className="flex flex-col gap-3 mt-1">
                <button
                  type="submit"
                  disabled={!topic.trim()}
                  className="group relative w-full overflow-hidden rounded-xl bg-gradient-to-r from-brand-purple to-indigo-600 p-[1px] transition-all hover:scale-[1.01] active:scale-95 shadow-[0_0_20px_rgba(139,92,246,0.2)] disabled:opacity-50 disabled:scale-100 disabled:shadow-none"
                >
                  <div className="relative flex items-center justify-center gap-1.5 rounded-[11px] bg-gradient-to-r from-brand-purple to-indigo-600 px-6 py-2.5 transition-all group-hover:from-brand-purple-light group-hover:to-brand-purple-dark">
                    <i className="fa-solid fa-graduation-cap text-white text-xs"></i>
                    <span className="text-[15px] font-extrabold text-white">Reveal My Blind Spots</span>
                    <i className="fa-solid fa-arrow-right text-white text-xs transition-transform group-hover:translate-x-0.5"></i>
                  </div>
                </button>

                <div className="flex items-center justify-center gap-1 text-[10px] text-gray-500 font-semibold">
                  <i className="fa-solid fa-circle-check text-brand-emerald"></i>
                  <span>AI analyzes understanding across 100+ dimensions</span>
                </div>
              </div>
            )}
          </form>
        </div>
      </main>

      {/* Footer Features (Typography scaled) */}
      <footer className="w-full max-w-[850px] px-4 pb-3 md:pb-6 z-20 flex flex-col items-center mt-2">
        <div className="w-full bg-brand-card/40 backdrop-blur-xl border border-brand-border/30 rounded-xl px-6 py-3 flex justify-between items-center gap-4 text-[13px] font-medium text-gray-300">
          <div className="flex items-center gap-2">
            <i className="fa-solid fa-lock text-brand-purple-light"></i>
            <span>Private & Secure</span>
          </div>
          <div className="flex items-center gap-2">
            <i className="fa-solid fa-brain text-brand-purple-light"></i>
            <span>Socratic Method</span>
          </div>
          <div className="flex items-center gap-2">
            <i className="fa-solid fa-diagram-project text-brand-purple-light"></i>
            <span>Dependency Maps</span>
          </div>
        </div>
      </footer>
    </div>
  )
}
