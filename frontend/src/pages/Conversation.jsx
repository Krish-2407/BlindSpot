import React, { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useFlow } from '../context/FlowContext'
import axios from 'axios'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000'

export default function Conversation() {
  const { sessionId, activeTopic, masterGraph, chatHistory, setChatHistory, setActiveScreen } = useFlow()
  const navigate = useNavigate()
  const [inputText, setInputText] = useState('')
  const [loading, setLoading] = useState(false)
  const [userModel, setUserModel] = useState([])
  const [selectedNode, setSelectedNode] = useState(null)
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const messagesEndRef = useRef(null)
  const bootstrapMessage = activeTopic ? `I want to evaluate my understanding of ${activeTopic}.` : ''

  // Redirect to home if no topic/session is initialized
  useEffect(() => {
    if (!activeTopic || !sessionId) {
      navigate('/')
    }
  }, [activeTopic, sessionId, navigate])

  // Scroll to bottom of chat when history changes
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [chatHistory])

  // Initialize userModel from last chat history snapshot or masterGraph nodes
  useEffect(() => {
    if (chatHistory && chatHistory.length > 0) {
      const lastMsg = chatHistory[chatHistory.length - 1]
      if (lastMsg.userModelSnapshot) {
        setUserModel(lastMsg.userModelSnapshot)
        return
      }
    }
    if (masterGraph && masterGraph.nodes && userModel.length === 0) {
      setUserModel(masterGraph.nodes.map(node => ({
        id: node.id,
        confidence: 0.0,
        evidence: 'Initial state'
      })))
    }
  }, [chatHistory, masterGraph, userModel.length])

  // Auto-bootstrap Socratic chat if history is empty
  useEffect(() => {
    if (activeTopic && sessionId && chatHistory.length === 0 && !loading) {
      const bootstrapSession = async () => {
        setLoading(true)
        const initialMessage = bootstrapMessage
        
        // Add user's initial message locally
        const updatedHistory = [
          { role: 'user', content: initialMessage }
        ]
        setChatHistory(updatedHistory)

        try {
          const response = await axios.post(`${API_URL}/api/agent2`, {
            sessionId,
            messages: [],
            userMessage: initialMessage
          }, { timeout: 30000 })
          const { reply, updatedUserModel } = response.data
          setChatHistory([
            ...updatedHistory,
            { role: 'assistant', content: reply, userModelSnapshot: updatedUserModel }
          ])
          if (updatedUserModel) {
            setUserModel(updatedUserModel)
          }
        } catch (err) {
          console.error('Failed to bootstrap Socratic session:', err)
          setChatHistory([
            ...updatedHistory,
            { role: 'assistant', content: 'I had trouble processing that. Please try again.' }
          ])
        } finally {
          setLoading(false)
        }
      }
      bootstrapSession()
    }
  }, [activeTopic, sessionId, chatHistory.length, loading, setChatHistory, API_URL, bootstrapMessage])

  const handleSend = async (e) => {
    e.preventDefault()
    if (!inputText.trim() || loading) return

    const userMsgText = inputText.trim()
    setInputText('')
    setLoading(true)

    // Add user's message locally first
    const updatedHistory = [
      ...chatHistory,
      { role: 'user', content: userMsgText }
    ]
    setChatHistory(updatedHistory)

    // Filter out error messages from context history to maintain Gemini consistency
    const cleanHistory = chatHistory.filter(m => m.role === 'user' || (m.role === 'assistant' && m.userModelSnapshot))

    try {
      const response = await axios.post(`${API_URL}/api/agent2`, {
        sessionId,
        messages: cleanHistory,
        userMessage: userMsgText
      }, { timeout: 30000 })

      const { reply, updatedUserModel } = response.data

      setChatHistory([
        ...updatedHistory,
        { role: 'assistant', content: reply, userModelSnapshot: updatedUserModel }
      ])
      setUserModel(updatedUserModel)
    } catch (err) {
      console.error(err)
      setChatHistory([
        ...updatedHistory,
        { role: 'assistant', content: 'I had trouble processing that. Please try again.' }
      ])
    } finally {
      setLoading(false)
    }
  }

  const handleFinish = () => {
    setActiveScreen('results')
    navigate('/results')
  }

  const handleNodeSelect = (node) => {
    const modelState = userModel.find(item => item.id === node.id)
    const confidence = modelState ? modelState.confidence : 0
    const evidence = modelState ? modelState.evidence : 'No diagnostics available yet'

    setSelectedNode({
      ...node,
      confidence,
      evidence
    })
    setIsDrawerOpen(true)
  }

  if (!activeTopic) return null

  // The auto-bootstrap user message starts the interview, but it is not an answer.
  // Count completed rounds (user answer + AI reply pairs) excluding the bootstrap exchange.
  const userMessages = chatHistory.filter(m => m.role === 'user')
  const assistantMessages = chatHistory.filter(m => m.role === 'assistant')
  const hasBootstrap = userMessages[0]?.content === bootstrapMessage
  const userAnswerCount = Math.max(0, userMessages.length - (hasBootstrap ? 1 : 0))
  const assistantReplyCount = Math.max(0, assistantMessages.length - (hasBootstrap ? 1 : 0))
  // A turn is only "complete" when the AI has replied to the user's answer
  const totalTurns = Math.min(userAnswerCount, assistantReplyCount)
  const maxTurns = 5

  const exploredConcepts = userModel.filter(c => c.confidence > 0 || c.evidence !== 'Initial state')
  const averageConfidence = exploredConcepts.length > 0
    ? (exploredConcepts.reduce((acc, curr) => acc + curr.confidence, 0) / exploredConcepts.length)
    : 0
  const overallScore = Math.round(averageConfidence * 100)

  const strengths = userModel.filter(c => c.confidence >= 0.6)
  const gaps = userModel.filter(c => c.confidence > 0.0 && c.confidence < 0.6)

  // Map concepts from masterGraph for visual tree representation
  const graphNodes = masterGraph?.nodes || []

  return (
    <div className="h-screen w-full flex overflow-hidden font-sans text-sm antialiased bg-[#020617] text-[#e2e2e6] relative">
      
      {/* Styles for nodes, scrollbar, tree-lines, glow states */}
      <style dangerouslySetInnerHTML={{ __html: `
        ::-webkit-scrollbar { width: 6px; height: 6px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #1e1b4b; border-radius: 4px; }
        ::-webkit-scrollbar-thumb:hover { background: #312e81; }
        
        .glow-primary { box-shadow: 0 0 15px rgba(139, 92, 246, 0.3); }
        .glow-success { box-shadow: 0 0 15px rgba(16, 185, 129, 0.3); }
        .glow-warning { box-shadow: 0 0 15px rgba(245, 158, 11, 0.3); }
        .glow-error { box-shadow: 0 0 15px rgba(239, 68, 68, 0.3); }
        .drawer-transition {
          transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.3s ease;
        }
      `}} />

      {/* Left Sidebar */}
      <aside className="w-64 bg-[#060e20] border-r border-[#1a2336] flex flex-col justify-between flex-shrink-0 z-20">
        <div className="p-6">
          {/* Logo */}
          <div className="flex items-center gap-3 mb-10 cursor-pointer" onClick={() => navigate('/')}>
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-brand-purple to-purple-900 flex items-center justify-center glow-primary">
              <i className="fa-solid fa-eye text-white text-xs"></i>
            </div>
            <div>
              <h1 className="text-white font-bold text-base leading-tight">BlindSpot</h1>
              <p className="text-[10px] text-gray-500">Socratic Evaluator</p>
            </div>
          </div>
          {/* CTA */}
          <button 
            onClick={() => navigate('/')}
            className="w-full bg-brand-purple hover:bg-brand-purple-light text-white rounded-xl py-3 px-4 font-semibold flex items-center justify-center gap-2 mb-8 transition-all duration-200 glow-primary"
          >
            <i className="fa-solid fa-plus text-xs"></i>
            New Assessment
          </button>
          {/* Navigation */}
          <nav className="space-y-2">
            <div className="flex items-center gap-3 px-4 py-3 rounded-lg text-white bg-brand-card border border-brand-border/40 cursor-default">
              <i className="fa-solid fa-book-open text-brand-purple"></i>
              <span className="font-semibold text-xs uppercase tracking-wider">Assessment Room</span>
            </div>
          </nav>
        </div>
        <div className="p-6 text-[11px] text-gray-600 border-t border-brand-border/20">
          <p>© 2026 BlindSpot AI</p>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 bg-[#020617] relative z-10">
        
        {/* Top Header */}
        <header className="h-20 border-b border-[#1a2336] flex items-center justify-between px-8 flex-shrink-0 bg-[#060e20]">
          <div className="flex items-center gap-3">
            <div className="w-2.5 h-2.5 rounded-full bg-brand-purple glow-primary animate-pulse"></div>
            <div>
              <h2 className="text-white font-bold text-base">{activeTopic}</h2>
              <p className="text-xs text-gray-500">Diagnostic Socratic Interview</p>
            </div>
          </div>
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-3">
              <span className="text-xs text-gray-400">Interview Progress</span>
              <div className="w-36 h-1.5 bg-brand-dark rounded-full overflow-hidden border border-brand-border/30">
                <div 
                  className="h-full bg-brand-purple rounded-full transition-all duration-300"
                  style={{ width: `${(Math.min(totalTurns, maxTurns) / maxTurns) * 100}%` }}
                ></div>
              </div>
              <span className="text-xs font-semibold text-white">{Math.min(totalTurns, maxTurns)} / {maxTurns} turns</span>
            </div>
            <div className="w-8 h-8 rounded-full bg-brand-purple/10 border border-brand-purple/20 flex items-center justify-center text-sm font-semibold text-brand-purple-light">
              BS
            </div>
          </div>
        </header>

        {/* Workspace Split */}
        <div className="flex-1 flex overflow-hidden">
          
          {/* Left Panel (Socratic Chat) */}
          <section className="flex-1 flex flex-col border-r border-[#1a2336] min-w-[400px] relative bg-[#020617]">
            <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-6 pb-28 scrollbar-thin">
              {chatHistory.map((msg, idx) => (
                <div key={idx} className="space-y-4">
                  {msg.role === 'user' ? (
                    /* User Message */
                    <div className="flex justify-end">
                      <div className="bg-brand-card border border-brand-border/60 rounded-2xl rounded-tr-none px-4 py-3 max-w-[85%] text-gray-200">
                        <p className="text-[13px] leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                      </div>
                    </div>
                  ) : (
                    /* Assistant Message */
                    <div className="space-y-4">
                      <div className="flex justify-start">
                        <div className="bg-[#131b2e] border border-brand-border/40 rounded-2xl rounded-tl-none px-4 py-3 max-w-[85%] text-gray-200">
                          <p className="text-[13px] leading-relaxed whitespace-pre-wrap font-medium">{msg.content}</p>
                        </div>
                      </div>

                      {/* Diagnostic Score Card (show next to/under each AI reply if snapshot is available) */}
                      {msg.userModelSnapshot && msg.userModelSnapshot.length > 0 && (
                        <div className="bg-gradient-to-br from-[#140e28] to-[#0a0514] border border-brand-purple/20 rounded-2xl p-5 w-full max-w-[90%] relative overflow-hidden shadow-2xl transition-all">
                          <div className="absolute -top-12 -right-12 w-48 h-48 bg-brand-purple/5 rounded-full blur-[60px]"></div>
                          
                          <div className="flex items-center gap-3 mb-4 relative z-10">
                            <div className="w-8 h-8 rounded-lg bg-brand-purple/10 flex items-center justify-center text-brand-purple border border-brand-purple/20">
                              <i className="fa-solid fa-microchip text-xs"></i>
                            </div>
                            <div>
                              <h3 className="text-white font-bold text-xs">AI Evaluation Insights</h3>
                              <p className="text-[10px] text-gray-500">Real-time Socratic assessment feedback</p>
                            </div>
                          </div>

                          <div className="mb-4 relative z-10">
                            <div className="flex justify-between items-end mb-1">
                              <span className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider">Dynamic Score</span>
                              <span className="text-base font-bold text-white">{overallScore}%</span>
                            </div>
                            <div className="w-full h-2 bg-black/40 rounded-full border border-brand-border/20">
                              <div 
                                className="h-full bg-gradient-to-r from-brand-purple to-brand-emerald rounded-full transition-all duration-300"
                                style={{ width: `${overallScore}%` }}
                              ></div>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-4 relative z-10 border-t border-brand-border/20 pt-3 text-[11px]">
                            <div>
                              <div className="flex items-center gap-1 text-brand-emerald font-semibold mb-2">
                                <i className="fa-solid fa-arrow-trend-up text-[10px]"></i>
                                <span>Strengths</span>
                              </div>
                              <ul className="text-gray-400 space-y-1">
                                {strengths.length > 0 ? (
                                  strengths.slice(0, 3).map(s => (
                                    <li key={s.id} className="truncate">• {graphNodes.find(n => n.id === s.id)?.label || s.id}</li>
                                  ))
                                ) : (
                                  <li className="italic text-gray-600">Probing concepts...</li>
                                )}
                              </ul>
                            </div>
                            <div>
                              <div className="flex items-center gap-1 text-yellow-400 font-semibold mb-2">
                                <i className="fa-solid fa-triangle-exclamation text-[10px]"></i>
                                <span>Diagnosed Gaps</span>
                              </div>
                              <ul className="text-gray-400 space-y-1">
                                {gaps.length > 0 ? (
                                  gaps.slice(0, 3).map(g => (
                                    <li key={g.id} className="truncate">• {graphNodes.find(n => n.id === g.id)?.label || g.id}</li>
                                  ))
                                ) : (
                                  <li className="italic text-gray-600">None detected yet.</li>
                                )}
                              </ul>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
              
              {/* Spinner while loading backend */}
              {loading && (
                <div className="flex justify-start">
                  <div className="bg-[#131b2e]/60 border border-brand-border/20 rounded-2xl rounded-tl-none px-4 py-3 flex items-center gap-2 text-xs text-brand-purple-light">
                    <div className="w-3.5 h-3.5 border-2 border-brand-purple/20 border-t-brand-purple rounded-full animate-spin"></div>
                    <span>BlindSpot is thinking...</span>
                  </div>
                </div>
              )}

              {/* Discovery Trigger Button after target turns */}
              {totalTurns >= maxTurns && !loading && (
                <div className="flex justify-center py-6">
                  <button
                    onClick={handleFinish}
                    className="py-3.5 px-8 bg-gradient-to-r from-brand-purple to-brand-accent hover:from-brand-purple-light hover:to-brand-accent text-white font-bold rounded-xl transition-all duration-200 shadow-[0_0_25px_rgba(139,92,246,0.3)] hover:scale-105 active:scale-95 border border-brand-purple/20 flex items-center gap-2 animate-bounce"
                  >
                    <i className="fa-solid fa-lightbulb"></i>
                    <span>Discover My Blind Spots</span>
                  </button>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Input Form at bottom */}
            {totalTurns < maxTurns && (
              <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-[#020617] via-[#020617] to-transparent pt-10">
                <form onSubmit={handleSend} className="relative">
                  <input
                    type="text"
                    disabled={loading}
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    placeholder="Provide your explanation or response..."
                    className="w-full bg-[#060e20] border border-brand-border/60 rounded-2xl py-4.5 pl-5 pr-14 text-white placeholder-gray-600 focus:outline-none focus:border-brand-purple focus:ring-1 focus:ring-brand-purple/30 transition-all shadow-2xl text-xs md:text-sm"
                  />
                  <button
                    type="submit"
                    disabled={!inputText.trim() || loading}
                    className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 bg-brand-purple hover:bg-brand-purple-light text-white rounded-xl flex items-center justify-center transition-all shadow-glow-purple active:scale-95 disabled:opacity-40 disabled:scale-100"
                  >
                    <i className="fa-solid fa-paper-plane text-xs"></i>
                  </button>
                </form>
                <div className="text-center mt-2 text-[10px] text-gray-500">
                  Provide detailed Socratic responses to improve assessment reliability.
                </div>
              </div>
            )}
          </section>

          {/* Right Panel (Live Concept Map List) */}
          <section className="w-[360px] bg-[#020617] flex flex-col flex-shrink-0 relative border-l border-[#1a2336]">
            <div className="p-5 border-b border-brand-border/20 bg-[#060e20]">
              <h2 className="text-white font-bold text-sm">Your Knowledge Map</h2>
              <p className="text-[11px] text-gray-500">Real-time status of mapped concepts</p>

              {/* Legend Grid */}
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 mt-3 border-t border-brand-border/20 pt-3 text-[10px] text-gray-400">
                <div className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-brand-emerald"></span>
                  <span>Mastered (&ge;70%)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-brand-purple"></span>
                  <span>Partial (40-69%)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-yellow-500"></span>
                  <span>Weak (1-39%)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span>
                  <span>Not Explored / Gap</span>
                </div>
              </div>
            </div>

            {/* Concepts List Grid */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2.5 bg-[#020617]">
              {graphNodes.length > 0 ? (
                graphNodes.map((node) => {
                  // Find confidence score
                  const modelState = userModel.find(item => item.id === node.id)
                  const score = modelState ? modelState.confidence : 0.0
                  const isExplored = modelState && modelState.evidence !== 'Initial state'

                  let badgeColorClass = 'border-red-500/20 bg-red-500/10 text-red-400'
                  let glowClass = 'glow-error border-red-500/50'

                  if (isExplored) {
                    if (score >= 0.7) {
                      badgeColorClass = 'border-brand-emerald/20 bg-brand-emerald/10 text-brand-emerald'
                      glowClass = 'glow-success border-brand-emerald/50'
                    } else if (score >= 0.4) {
                      badgeColorClass = 'border-brand-purple/20 bg-brand-purple/10 text-brand-purple-light'
                      glowClass = 'glow-primary border-brand-purple/50'
                    } else if (score > 0.0) {
                      badgeColorClass = 'border-yellow-500/20 bg-yellow-500/10 text-yellow-400'
                      glowClass = 'glow-warning border-yellow-500/50'
                    }
                  }

                  return (
                    <div 
                      key={node.id} 
                      onClick={() => handleNodeSelect(node)}
                      className={`p-3 bg-brand-card/50 border border-brand-border/40 rounded-xl transition-all duration-200 cursor-pointer hover:scale-[1.02] hover:bg-brand-card/80 active:scale-[0.98] ${glowClass}`}
                    >
                      <div className="flex items-center justify-between gap-2 mb-1.5">
                        <span className="font-semibold text-white text-xs truncate">{node.label}</span>
                        <span className={`text-[9px] font-bold px-2 py-0.5 rounded border uppercase ${badgeColorClass}`}>
                          {isExplored ? `${Math.round(score * 100)}%` : 'unexplored'}
                        </span>
                      </div>
                      <p className="text-[10px] text-gray-400 font-light leading-relaxed truncate">{node.description}</p>
                    </div>
                  )
                })
              ) : (
                <div className="text-center py-10 text-xs text-gray-600">
                  Concept map loading...
                </div>
              )}
            </div>

            {/* Sidebar Insight Card */}
            <div className="p-4 border-t border-brand-border/20 bg-[#060e20]/60">
              <div className="bg-brand-card/80 border border-brand-border/40 rounded-xl p-3.5 flex gap-3 text-xs leading-relaxed text-gray-400">
                <i className="fa-solid fa-brain text-brand-purple-light mt-0.5"></i>
                <div>
                  <h4 className="text-white font-semibold mb-0.5">Diagnostic Goal</h4>
                  <p className="text-[11px] font-light">Explain concepts in detail. The tutor adjusts questions dynamically based on concept unlocks.</p>
                </div>
              </div>
            </div>
          </section>
        </div>
      </main>

      {/* Detail Slide-out Drawer */}
      {selectedNode && (
        <div className={`fixed inset-0 z-50 flex justify-end transition-opacity duration-300 ${isDrawerOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}>
          {/* Backdrop Overlay */}
          <div 
            onClick={() => setIsDrawerOpen(false)}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm cursor-pointer"
          />
          
          {/* Drawer Container */}
          <div 
            className={`relative z-10 w-full sm:w-[380px] h-full bg-[#0B0F19]/95 backdrop-blur-2xl border-l border-brand-border/40 p-6 flex flex-col gap-5 shadow-[0_0_50px_rgba(0,0,0,0.8)] drawer-transition transform ${
              isDrawerOpen ? 'translate-x-0' : 'translate-x-full'
            }`}
          >
            {/* Close Button */}
            <button 
              onClick={() => setIsDrawerOpen(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-white bg-white/5 hover:bg-white/10 w-8 h-8 rounded-full flex items-center justify-center transition-all cursor-pointer"
            >
              <i className="fa-solid fa-xmark text-sm"></i>
            </button>

            {/* Drawer Header */}
            <div className="pr-8">
              <span className="text-[10px] font-bold text-brand-purple-light uppercase tracking-widest">Concept Details</span>
              <h2 className="text-lg font-bold text-white mt-1">{selectedNode.label}</h2>
            </div>

            <div className="flex flex-col gap-4 overflow-y-auto pr-1 pb-6">
              {/* Status Badge */}
              <div>
                <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">Understanding Level</div>
                {(() => {
                  const conf = selectedNode.confidence;
                  let badgeText = 'Mastered';
                  let badgeColor = 'text-brand-emerald border-brand-emerald/20 bg-brand-emerald/10';
                  if (conf < 0.4) {
                    badgeText = conf === 0 ? 'Unexplored' : 'Weak';
                    badgeColor = 'text-red-400 border-red-500/20 bg-red-500/10 animate-pulse';
                  } else if (conf < 0.7) {
                    badgeText = 'Partial';
                    badgeColor = 'text-brand-purple-light border-brand-purple/20 bg-brand-purple/10';
                  }
                  return (
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-xs font-bold ${badgeColor}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${conf < 0.4 ? 'bg-red-500' : conf < 0.7 ? 'bg-brand-purple' : 'bg-brand-emerald'}`}></span>
                      {badgeText} ({Math.round(conf * 100)}%)
                    </span>
                  );
                })()}
              </div>

              {/* Unlock Score */}
              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Unlock Score</span>
                  <span className="text-xs font-bold text-brand-purple-light">{selectedNode.unlock_score || 0} / 10</span>
                </div>
                <div className="w-full h-2 bg-black/40 rounded-full overflow-hidden border border-brand-border/20">
                  <div 
                    className="h-full rounded-full bg-gradient-to-r from-brand-purple to-brand-purple-light transition-all duration-500" 
                    style={{ width: `${((selectedNode.unlock_score || 0) / 10) * 100}%` }}
                  ></div>
                </div>
                <span className="text-[10px] text-gray-500 mt-1 block">Higher scores indicate concepts that unlock more downstream ideas.</span>
              </div>

              {/* Description */}
              {selectedNode.description && (
                <div className="bg-brand-card/40 border border-brand-border/30 rounded-xl p-3.5">
                  <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">AI Description</div>
                  <p className="text-xs text-gray-300 leading-relaxed">{selectedNode.description}</p>
                </div>
              )}

              {/* Diagnostic Evidence */}
              <div className="bg-[#0b0f19] border border-brand-border/40 rounded-xl p-3.5">
                <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Diagnostic Evidence</div>
                <p className="text-xs text-gray-300 leading-relaxed italic">"{selectedNode.evidence}"</p>
              </div>

              {/* Depth */}
              {selectedNode.depth && (
                <div className="flex items-center gap-2 text-[11px] text-gray-400">
                  <i className="fa-solid fa-layer-group text-brand-purple-light text-xs"></i>
                  <span>Depth Level: <span className="text-white font-semibold">{selectedNode.depth === 1 ? 'Basic' : selectedNode.depth === 2 ? 'Intermediate' : 'Advanced'}</span></span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
