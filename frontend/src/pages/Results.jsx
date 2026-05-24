import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useFlow } from '../context/FlowContext'

export default function Results() {
  const { activeTopic, sessionId, masterGraph, chatHistory, resetFlow } = useFlow()
  const navigate = useNavigate()
  
  const [userModel, setUserModel] = useState([])

  // Redirect to home if no topic is active
  useEffect(() => {
    if (!activeTopic) {
      navigate('/')
    }
  }, [activeTopic, navigate])

  // Extract user model from last chat history message if available
  useEffect(() => {
    if (chatHistory && chatHistory.length > 0) {
      const lastMsg = chatHistory[chatHistory.length - 1]
      if (lastMsg.userModelSnapshot) {
        setUserModel(lastMsg.userModelSnapshot)
      }
    }
  }, [chatHistory])

  if (!activeTopic) return null

  // Calculate session metrics dynamically
  const totalTurns = chatHistory.filter(m => m.role === 'user').length
  const explored = userModel.filter(c => c.confidence > 0 || c.evidence !== 'Initial state')
  
  // Overall score
  const avgConf = explored.length > 0 
    ? (explored.reduce((sum, curr) => sum + curr.confidence, 0) / explored.length) 
    : 0.5 // Fallback average if not enough data
  const overallScore = Math.round(avgConf * 100)

  // Strengths (mastered) & Gaps (blind spots)
  const strongConcepts = userModel.filter(c => c.confidence >= 0.7)
  const weakConcepts = userModel.filter(c => c.confidence > 0.0 && c.confidence < 0.7)
  const blindSpots = userModel.filter(c => c.confidence < 0.4)

  // Map concepts list
  const graphNodes = masterGraph?.nodes || []
  const graphEdges = masterGraph?.edges || []

  // Dynamic feedback copy based on score
  let feedbackTitle = 'Good Start!'
  let feedbackCopy = 'You have a solid foundation but have key gaps in advanced areas.'
  if (overallScore >= 80) {
    feedbackTitle = 'Excellent Understanding!'
    feedbackCopy = 'Outstanding concept mastery. You are ready to tackle highly advanced integrations.'
  } else if (overallScore < 50) {
    feedbackTitle = 'Learning Mode Active!'
    feedbackCopy = 'You are beginning to explore this topic. Focus heavily on core prerequisites first.'
  }

  const handleReset = () => {
    resetFlow()
    navigate('/')
  }

  return (
    <div className="bg-[#020617] text-[#dae2fd] font-sans min-h-screen flex flex-col antialiased">
      
      {/* Styles for glassmorphic cards, specific colors, and pulse animations */}
      <style dangerouslySetInnerHTML={{ __html: `
        .glass-card {
          background-color: #0F172A;
          border-top: 1px solid rgba(255, 255, 255, 0.08);
          border-left: 1px solid rgba(255, 255, 255, 0.05);
          border-right: 1px solid rgba(255, 255, 255, 0.05);
          border-bottom: 1px solid rgba(255, 255, 255, 0.05);
          box-shadow: 0 4px 30px rgba(0, 0, 0, 0.4);
        }
        .glow-primary { box-shadow: 0 0 15px rgba(168, 85, 247, 0.2); }
        .glow-primary-intense { box-shadow: 0 0 25px rgba(168, 85, 247, 0.35); }
        .glow-emerald { box-shadow: 0 0 15px rgba(16, 185, 129, 0.2); }
        .glow-error { box-shadow: 0 0 15px rgba(239, 68, 68, 0.2); }
      `}} />

      {/* TopAppBar */}
      <header className="bg-[#020617]/85 backdrop-blur-xl sticky top-0 z-50 border-b border-white/5 shadow-[0_4px_20px_rgba(168,85,247,0.05)]">
        <div className="flex justify-between items-center px-8 py-4 w-full max-w-6xl mx-auto">
          <div className="flex items-center gap-6">
            <div className="text-xl font-bold tracking-tight text-brand-purple-light flex items-center gap-2 cursor-pointer" onClick={handleReset}>
              <span className="material-symbols-outlined text-brand-purple-light" style={{ fontSize: '28px', fontVariationSettings: "'FILL' 1" }}>visibility</span>
              BlindSpot AI
            </div>
            <nav className="hidden md:flex gap-6 ml-6">
              <span className="text-brand-purple border-b-2 border-brand-purple pb-1 text-xs uppercase tracking-wider font-semibold">Insights Report</span>
            </nav>
          </div>
          <div className="flex items-center gap-3">
            <button 
              onClick={handleReset}
              className="flex items-center gap-1.5 bg-brand-purple hover:bg-brand-purple-light text-white text-xs font-semibold px-4 py-2 rounded-full hover:scale-95 transition-all duration-100 glow-primary"
            >
              <span className="material-symbols-outlined text-sm">add</span>
              New Assessment
            </button>
            <div className="w-8 h-8 rounded-full border border-brand-border/40 bg-brand-card flex items-center justify-center text-sm font-semibold text-brand-purple-light">
              BS
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-grow flex flex-col gap-12 px-6 md:px-8 py-10 max-w-5xl mx-auto w-full">
        
        {/* Hero / Summary Header */}
        <div className="flex flex-col gap-4 w-full text-center md:text-left">
          <div className="inline-flex items-center gap-1.5 text-brand-emerald font-semibold text-xs bg-brand-emerald/10 px-3.5 py-1.5 rounded-full w-max mx-auto md:mx-0 border border-brand-emerald/20">
            <span className="material-symbols-outlined text-brand-emerald" style={{ fontSize: '15px', fontVariationSettings: "'FILL' 1" }}>check_circle</span>
            Assessment Verified
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-white tracking-tight leading-tight">
            Here's your Socratic understanding report for <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-purple-light to-brand-accent">{activeTopic}</span>
          </h1>
        </div>

        {/* Summary Stats Grid */}
        <section className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-5 w-full">
          {/* Overall Understanding */}
          <div className="glass-card rounded-2xl p-5 flex flex-col items-center md:items-start gap-4">
            <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest">Overall Understanding</div>
            <div className="flex items-center gap-4 w-full">
              <div className="relative w-14 h-14 flex-shrink-0">
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                  <circle className="text-gray-800" cx="18" cy="18" r="16" fill="none" stroke="currentColor" strokeWidth="3"></circle>
                  <circle 
                    className="text-brand-purple" 
                    cx="18" 
                    cy="18" 
                    r="16" 
                    fill="none" 
                    stroke="currentColor" 
                    strokeDasharray={`${overallScore}, 100`} 
                    strokeWidth="3"
                  ></circle>
                </svg>
                <div className="absolute inset-0 flex items-center justify-center text-sm text-brand-purple-light font-bold">{overallScore}%</div>
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-sm font-bold text-brand-purple-light truncate">{feedbackTitle}</span>
                <span className="text-[10px] text-gray-400 mt-0.5 line-clamp-2">{feedbackCopy}</span>
              </div>
            </div>
          </div>

          {/* Socratic Dialogue Turns */}
          <div className="glass-card rounded-2xl p-5 flex flex-col gap-2 justify-between">
            <div className="flex items-center gap-1.5 text-[10px] font-semibold text-gray-400 uppercase tracking-widest">
              <span className="material-symbols-outlined text-brand-purple-light text-sm">forum</span>
              Socratic Turns
            </div>
            <div>
              <div className="text-3xl font-bold text-white">{totalTurns} <span className="text-gray-500 text-sm">/ 5</span></div>
              <div className="text-[10px] text-brand-purple-light mt-1">Interactions Complete</div>
            </div>
          </div>

          {/* Strong Areas */}
          <div className="glass-card rounded-2xl p-5 flex flex-col gap-2 justify-between">
            <div className="flex items-center gap-1.5 text-[10px] font-semibold text-gray-400 uppercase tracking-widest">
              <span className="material-symbols-outlined text-brand-emerald text-sm">task_alt</span>
              Mastered Concepts
            </div>
            <div>
              <div className="text-3xl font-bold text-white">{strongConcepts.length}</div>
              <div className="text-[10px] text-brand-emerald mt-1">Confidence Score &ge; 70%</div>
            </div>
          </div>

          {/* Blind Spots */}
          <div className="glass-card rounded-2xl p-5 flex flex-col gap-2 justify-between border-red-500/20 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-red-500"></div>
            <div className="flex items-center gap-1.5 text-[10px] font-semibold text-red-400 uppercase tracking-widest">
              <span className="material-symbols-outlined text-sm">warning</span>
              Active Gaps
            </div>
            <div>
              <div className="text-3xl font-bold text-red-500 glow-error">{blindSpots.length}</div>
              <div className="text-[10px] text-red-400 mt-1">Need immediate focus</div>
            </div>
          </div>
        </section>

        {/* Live Network Diagram & Dynamic Gaps List split */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Concept Map visualizer */}
          <div className="lg:col-span-2 glass-card rounded-2xl p-6 flex flex-col justify-between min-h-[380px]">
            <div>
              <h2 className="text-lg font-bold text-white mb-1">Concept Dependency Map</h2>
              <p className="text-[11px] text-gray-500">
                Visual structure showing unlock scores and prerequisite links. Pulsing nodes require focus.
              </p>
            </div>
            
            {/* Visual Node Network */}
            <div className="flex-grow flex items-center justify-center border border-dashed border-brand-border/40 rounded-xl bg-brand-dark/30 p-8 my-4 relative overflow-hidden">
              <div className="relative w-full h-48 flex items-center justify-center">
                {/* Center Node */}
                <div className="relative z-10 w-16 h-16 bg-[#0c0e1a] border-2 border-brand-purple rounded-full flex items-center justify-center glow-primary-intense">
                  <span className="material-symbols-outlined text-brand-purple-light text-2xl">science</span>
                  <span className="absolute -bottom-6 text-[10px] font-bold text-brand-purple-light whitespace-nowrap uppercase tracking-wider">{activeTopic.slice(0, 15)}</span>
                </div>

                {/* Nodes surrounding it */}
                {graphNodes.slice(0, 5).map((node, index) => {
                  const state = userModel.find(item => item.id === node.id)
                  const score = state ? state.confidence : 0
                  const isExplored = state && state.evidence !== 'Initial state'

                  // Coordinates around circular arrangement
                  const angle = (index * 2 * Math.PI) / Math.min(graphNodes.length, 5)
                  const radius = 90 // pixels
                  const x = Math.round(Math.cos(angle) * radius)
                  const y = Math.round(Math.sin(angle) * radius)

                  let borderClass = 'border-gray-700 text-gray-500'
                  let glowNode = ''
                  if (isExplored) {
                    if (score >= 0.7) {
                      borderClass = 'border-brand-emerald text-brand-emerald glow-emerald'
                    } else if (score >= 0.4) {
                      borderClass = 'border-brand-purple text-brand-purple glow-primary'
                    } else {
                      borderClass = 'border-red-500 text-red-500 glow-error animate-pulse'
                    }
                  }

                  return (
                    <React.Fragment key={node.id}>
                      {/* Node circle */}
                      <div 
                        className={`absolute w-10 h-10 rounded-full bg-[#0c0e1a] border-2 flex items-center justify-center z-10 ${borderClass}`}
                        style={{ transform: `translate(${x}px, ${y}px)` }}
                        title={`${node.label}: ${Math.round(score * 100)}%`}
                      >
                        <span className="text-[10px] font-bold truncate max-w-[28px]">{node.label.slice(0, 3)}</span>
                      </div>

                      {/* SVG Line linking to center */}
                      <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-20">
                        <line 
                          x1="50%" 
                          y1="50%" 
                          x2={`calc(50% + ${x}px)`} 
                          y2={`calc(50% + ${y}px)`} 
                          stroke={score >= 0.7 ? '#10b981' : score >= 0.4 ? '#8b5cf6' : '#ef4444'} 
                          strokeWidth="1.5" 
                          strokeDasharray="4"
                        />
                      </svg>
                    </React.Fragment>
                  )
                })}
              </div>
            </div>

            <div className="flex gap-4 items-center justify-center text-[10px] text-gray-400">
              <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-brand-emerald"></span>Mastered</div>
              <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-brand-purple"></span>Partial</div>
              <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>Blind Spot</div>
            </div>
          </div>

          {/* Gaps / Recommended Socratic items list */}
          <div className="flex flex-col gap-6">
            <div className="glass-card rounded-2xl p-6 flex-grow flex flex-col gap-4">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                Recommended Questions
                <span className="text-[9px] uppercase bg-red-500/10 text-red-400 px-2 py-0.5 rounded border border-red-500/20 font-semibold">{blindSpots.length} Gaps</span>
              </h2>
              <p className="text-[11px] text-gray-500">
                Top queries to test yourself, designed to unlock dependencies.
              </p>

              <div className="space-y-3 max-h-[260px] overflow-y-auto pr-1">
                {blindSpots.length > 0 ? (
                  blindSpots.map((spot, idx) => {
                    const node = graphNodes.find(n => n.id === spot.id)
                    const label = node ? node.label : spot.id
                    return (
                      <div key={spot.id} className="bg-brand-card/50 border border-brand-border/40 hover:border-brand-purple/45 rounded-xl p-3.5 transition-all">
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-[9px] bg-brand-purple/10 text-brand-purple-light px-1.5 py-0.5 rounded border border-brand-purple/20 font-bold uppercase">Question {idx + 1}</span>
                          <span className="text-[9px] text-red-400 bg-red-500/10 px-1.5 py-0.5 rounded font-semibold uppercase">Gap: {label}</span>
                        </div>
                        <p className="text-[11px] text-gray-300 leading-relaxed font-light">
                          How does {label} resolve variables dynamically under heavy async execution constraints?
                        </p>
                      </div>
                    )
                  })
                ) : (
                  <div className="text-center py-10 text-xs text-gray-500 italic">
                    No significant gaps identified. Excellent!
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Detailed performance breakdown */}
        <section className="glass-card rounded-2xl p-6 md:p-8 flex flex-col gap-5 w-full">
          <h2 className="text-lg font-bold text-white">Concept Understanding Metrics</h2>
          <div className="flex flex-col gap-4 mt-2">
            {graphNodes.slice(0, 6).map((node) => {
              const state = userModel.find(item => item.id === node.id)
              const score = state ? state.confidence : 0
              const percentage = Math.round(score * 100)
              
              let barColor = 'bg-gray-600'
              let textColor = 'text-gray-500'
              if (score >= 0.7) {
                barColor = 'bg-brand-emerald'
                textColor = 'text-brand-emerald'
              } else if (score >= 0.4) {
                barColor = 'bg-brand-purple'
                textColor = 'text-brand-purple-light'
              } else if (score > 0.0) {
                barColor = 'bg-red-500 shadow-glow-error'
                textColor = 'text-red-400'
              }

              return (
                <div key={node.id} className="flex items-center gap-4 w-full">
                  <div className="w-1/4 text-xs font-semibold text-gray-300 truncate">{node.label}</div>
                  <div className="flex-grow h-2.5 bg-black/40 rounded-full overflow-hidden border border-brand-border/20">
                    <div className={`h-full rounded-full transition-all duration-300 ${barColor}`} style={{ width: `${Math.max(percentage, 5)}%` }}></div>
                  </div>
                  <div className={`w-10 text-right text-[10px] font-bold tracking-wider ${textColor}`}>{percentage}%</div>
                </div>
              )
            })}
          </div>
        </section>

        {/* Learning Roadmap timeline */}
        <section className="glass-card rounded-2xl p-6 md:p-8 flex flex-col gap-5 w-full">
          <h2 className="text-lg font-bold text-white">Your Path to Mastery</h2>
          <p className="text-[11px] text-gray-500 -mt-2">
            We've sorted your gaps topologically by their dependency hierarchy. Focus on these steps in order to unlock advanced topics.
          </p>

          <div className="relative flex flex-col gap-8 border-l border-brand-border/60 ml-4 pl-6 py-2">
            {weakConcepts.length > 0 ? (
              weakConcepts.slice(0, 3).map((concept, index) => {
                const node = graphNodes.find(n => n.id === concept.id)
                const label = node ? node.label : concept.id
                const desc = node ? node.description : 'Prerequisite concept for your topic.'
                
                let stepBg = 'bg-brand-purple/20 border-brand-purple text-brand-purple-light'
                if (concept.confidence < 0.4) {
                  stepBg = 'bg-red-500/20 border-red-500 text-red-400 shadow-glow-error'
                }

                return (
                  <div key={concept.id} className="relative w-full">
                    <div className={`absolute -left-[37px] top-0 w-8 h-8 rounded-full border-2 flex items-center justify-center text-xs font-bold z-10 bg-[#0F172A] ${stepBg}`}>
                      {index + 1}
                    </div>
                    <h3 className="text-sm font-semibold text-white">{label}</h3>
                    <p className="text-xs text-gray-400 mt-1 leading-relaxed">{desc}</p>
                  </div>
                )
              })
            ) : (
              <div className="relative w-full">
                <div className="absolute -left-[37px] top-0 w-8 h-8 rounded-full border-2 border-brand-emerald bg-[#0F172A] flex items-center justify-center text-xs font-bold text-brand-emerald z-10">
                  ✓
                </div>
                <h3 className="text-sm font-semibold text-white">All Clear!</h3>
                <p className="text-xs text-gray-400 mt-1 leading-relaxed">No concept gaps found. You have achieved full mastery of mapped topics!</p>
              </div>
            )}
          </div>
        </section>

        {/* Start Learning Plan Button */}
        <section className="flex justify-center w-full pb-8">
          <button 
            onClick={handleReset}
            className="bg-brand-purple hover:bg-brand-purple-light text-white font-bold text-base px-8 py-3.5 rounded-xl flex items-center gap-2 transition-all shadow-glow-primary-intense hover:scale-[1.02] duration-300 w-full max-w-lg justify-center shadow-lg border border-brand-purple/20"
          >
            <span>Start New Learning Session</span>
            <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>rocket_launch</span>
          </button>
        </section>

      </main>

      {/* Footer */}
      <footer className="bg-[#060e20] py-6 border-t border-white/5 flex flex-col md:flex-row justify-between items-center px-8 gap-4 mt-auto text-xs text-gray-500">
        <div className="font-bold text-white flex items-center gap-1.5">
          <span className="material-symbols-outlined text-brand-purple-light" style={{ fontSize: '18px' }}>visibility</span>
          BlindSpot AI
        </div>
        <div className="flex gap-4">
          <a className="hover:text-brand-purple-light transition-colors" href="#">Privacy</a>
          <a className="hover:text-brand-purple-light transition-colors" href="#">Terms</a>
          <a className="hover:text-brand-purple-light transition-colors" href="#">AI Model Ethics</a>
        </div>
        <div>
          © 2026 BlindSpot. Digital Enlightenment.
        </div>
      </footer>
    </div>
  )
}
