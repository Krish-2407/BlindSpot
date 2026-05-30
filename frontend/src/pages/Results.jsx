import React, { useEffect, useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useFlow } from '../context/FlowContext'
import axios from 'axios'
import * as d3 from 'd3'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000'

export default function Results() {
  const { sessionId, activeTopic, masterGraph, chatHistory, resetFlow } = useFlow()
  const navigate = useNavigate()
  
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  
  // Real data state
  const [rankedGaps, setRankedGaps] = useState([])
  const [questions, setQuestions] = useState([])
  const [learningPath, setLearningPath] = useState([])
  const [selectedNode, setSelectedNode] = useState(null)
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)

  // Remediation Plan states
  const [realUserModel, setRealUserModel] = useState([])
  const [loadingStep, setLoadingStep] = useState('ranking') // 'ranking' | 'generating'
  const [modalContent, setModalContent] = useState(null)

  const svgRef = useRef(null)

  // Restore topic and expert graph from localStorage fallback if missing in context (on reload)
  const finalTopic = activeTopic || localStorage.getItem('blindspot_topic') || 'Assessment Results'
  const localGraphText = localStorage.getItem('blindspot_expert_graph')
  const finalGraph = masterGraph || (localGraphText ? JSON.parse(localGraphText) : null)
  const graphNodes = finalGraph?.nodes || []

  // Reconstruct user model confidence mapping using real data from the backend
  const userModel = graphNodes.map(node => {
    const realMatch = realUserModel.find(u => u.id === node.id);
    if (realMatch) {
      return {
        id: node.id,
        confidence: realMatch.confidence,
        evidence: realMatch.evidence || 'Identified gap'
      };
    }
    const gap = rankedGaps.find(g => g.concept === node.id);
    if (gap) {
      const calculatedConf = Math.max(0.05, Math.min(0.49, 0.5 - (gap.priority * 0.045)));
      return {
        id: node.id,
        confidence: calculatedConf,
        evidence: gap.why || 'Identified gap'
      };
    }
    return {
      id: node.id,
      confidence: 0.0,
      evidence: 'Unexplored concept'
    };
  })

  const fetchResultsData = async () => {
    if (!sessionId) {
      setError('No session found. Please start a new assessment.')
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      setError(null)
      setLoadingStep('ranking')

      // Call Agent 3 Gap Ranker
      const agent3Res = await axios.post(`${API_URL}/api/agent3`, { sessionId }, { timeout: 30000 })
      const fetchedRankedGaps = agent3Res.data.rankedGaps || []
      setRankedGaps(fetchedRankedGaps)

      setLoadingStep('generating')

      // Call Agent 4 Socratic Output
      const agent4Res = await axios.post(`${API_URL}/api/agent4`, { sessionId }, { timeout: 30000 })
      const { questions: fetchedQuestions, learningPath: fetchedLearningPath } = agent4Res.data
      setQuestions(fetchedQuestions || [])
      setLearningPath(fetchedLearningPath || [])

      // Call GET /api/session/${sessionId} to get real userModel
      const sessionRes = await axios.get(`${API_URL}/api/session/${sessionId}`, { timeout: 30000 })
      const fetchedRealUserModel = sessionRes.data.userModel || []
      setRealUserModel(fetchedRealUserModel)

      setLoading(false)
    } catch (err) {
      console.error('Error fetching results:', err)
      if (err.code === 'ECONNABORTED') {
        setError('The analysis is taking too long. Please try again.')
      } else {
        setError("We couldn't load your results. Please go back and try again.")
      }
      setLoading(false)
    }
  }

  // D3 Force-Directed Graph Rendering Hook
  useEffect(() => {
    if (!finalGraph || !finalGraph.nodes || finalGraph.nodes.length === 0 || loading) return

    const container = svgRef.current?.parentElement
    const width = container?.clientWidth || 600
    const height = 400

    const svg = d3.select(svgRef.current)
      .attr('width', '100%')
      .attr('height', height)
      .attr('viewBox', `0 0 ${width} ${height}`)
      
    svg.selectAll('*').remove()

    // Add arrow markers for links
    svg.append('defs').append('marker')
      .attr('id', 'arrow')
      .attr('viewBox', '0 -5 10 10')
      .attr('refX', 24)
      .attr('refY', 0)
      .attr('markerWidth', 6)
      .attr('markerHeight', 6)
      .attr('orient', 'auto')
      .append('path')
      .attr('d', 'M0,-5L10,0L0,5')
      .attr('fill', '#475569')

    // Create copies of nodes/links
    const nodes = finalGraph.nodes.map(d => ({ ...d }))
    const links = (finalGraph.edges || []).map(d => ({
      source: d.from,
      target: d.to
    })).filter(l => 
      nodes.some(n => n.id === l.source) && nodes.some(n => n.id === l.target)
    )

    const simulation = d3.forceSimulation(nodes)
      .force('link', d3.forceLink(links).id(d => d.id).distance(120))
      .force('charge', d3.forceManyBody().strength(-150))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide().radius(32))

    // Draw links
    const link = svg.append('g')
      .selectAll('line')
      .data(links)
      .enter()
      .append('line')
      .attr('stroke', '#334155')
      .attr('stroke-opacity', 0.8)
      .attr('stroke-width', 1.5)
      .attr('marker-end', 'url(#arrow)')

    // Draw nodes groups
    const node = svg.append('g')
      .selectAll('g')
      .data(nodes)
      .enter()
      .append('g')
      .attr('class', 'cursor-pointer')
      .on('click', (event, d) => {
        const origNode = finalGraph.nodes.find(n => n.id === d.id)
        if (origNode) {
          handleNodeSelect(origNode)
        }
      })
      .call(d3.drag()
        .on('start', dragstarted)
        .on('drag', dragged)
        .on('end', dragended)
      )

    // Node circles with styling dynamic to confidence scores
    node.append('circle')
      .attr('r', 18)
      .attr('fill', '#090d16')
      .attr('stroke', d => {
        const state = userModel.find(item => item.id === d.id)
        const score = state ? state.confidence : 0
        const isExplored = state && state.evidence !== 'Initial state'
        if (!isExplored) return '#ef4444' // Unexplored Gap (pulsing red)
        if (score >= 0.7) return '#10b981' // Mastered
        if (score >= 0.4) return '#8b5cf6' // Partial
        return '#f59e0b' // Incomplete
      })
      .attr('stroke-width', 2.5)
      .attr('class', d => {
        const state = userModel.find(item => item.id === d.id)
        const score = state ? state.confidence : 0
        const isExplored = state && state.evidence !== 'Initial state'
        if (!isExplored || score < 0.4) {
          return 'animate-pulse'
        }
        return ''
      })
      .style('filter', d => {
        const state = userModel.find(item => item.id === d.id)
        const score = state ? state.confidence : 0
        const isExplored = state && state.evidence !== 'Initial state'
        if (!isExplored) return 'drop-shadow(0 0 6px rgba(239,68,68,0.5))'
        if (score >= 0.7) return 'drop-shadow(0 0 6px rgba(16,185,129,0.5))'
        if (score >= 0.4) return 'drop-shadow(0 0 6px rgba(139,92,246,0.5))'
        return 'drop-shadow(0 0 6px rgba(245,158,11,0.5))'
      })

    // Labels on nodes
    node.append('text')
      .attr('text-anchor', 'middle')
      .attr('dy', '.3em')
      .attr('fill', '#dae2fd')
      .attr('font-size', '10px')
      .attr('font-weight', 'bold')
      .text(d => d.label.slice(0, 3).toUpperCase())

    // Node label below node
    node.append('text')
      .attr('text-anchor', 'middle')
      .attr('dy', '2.5em')
      .attr('fill', '#94a3b8')
      .attr('font-size', '9px')
      .attr('font-weight', '500')
      .text(d => d.label.length > 15 ? d.label.slice(0, 12) + '...' : d.label)

    simulation.on('tick', () => {
      link
        .attr('x1', d => d.source.x)
        .attr('y1', d => d.source.y)
        .attr('x2', d => d.target.x)
        .attr('y2', d => d.target.y)

      node
        .attr('transform', d => `translate(${d.x},${d.y})`)
    })

    function dragstarted(event, d) {
      if (!event.active) simulation.alphaTarget(0.3).restart()
      d.fx = d.x
      d.fy = d.y
    }

    function dragged(event, d) {
      d.fx = event.x
      d.fy = event.y
    }

    function dragended(event, d) {
      if (!event.active) simulation.alphaTarget(0)
      d.fx = null
      d.fy = null
    }

    const handleResize = () => {
      if (!svgRef.current) return
      const newWidth = svgRef.current.parentElement.clientWidth
      svg.attr('viewBox', `0 0 ${newWidth} ${height}`)
      simulation.force('center', d3.forceCenter(newWidth / 2, height / 2))
      simulation.alpha(0.3).restart()
    }

    window.addEventListener('resize', handleResize)
    return () => {
      window.removeEventListener('resize', handleResize)
      simulation.stop()
    }
  }, [finalGraph, realUserModel, loading])

  // Redirect to home if no session exists
  useEffect(() => {
    if (!sessionId) {
      navigate('/')
      return
    }
    fetchResultsData()
  }, [sessionId])

  // Graph variables are now declared at the top of the component

  if (loading) {
    return (
      <div className="bg-[#020617] text-[#dae2fd] font-sans min-h-screen flex flex-col items-center justify-center antialiased relative overflow-hidden">
        {/* Subtle decorative glow in background */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-brand-purple/10 rounded-full blur-[100px] pointer-events-none"></div>
        <div className="flex flex-col items-center gap-5 relative z-10">
          <div className="w-12 h-12 border-4 border-brand-purple/20 border-t-brand-purple rounded-full animate-spin shadow-[0_0_15px_rgba(168,85,247,0.4)]"></div>
          <div className="text-center">
            {loadingStep === 'ranking' ? (
              <>
                <p className="text-base font-bold text-white tracking-wide animate-pulse">Ranking Gaps...</p>
                <p className="text-xs text-brand-purple-light font-medium mt-1 animate-pulse delay-75">Analyzing Socratic dialogue responses...</p>
              </>
            ) : (
              <>
                <p className="text-base font-bold text-white tracking-wide animate-pulse">Generating Questions...</p>
                <p className="text-xs text-brand-purple-light font-medium mt-1 animate-pulse delay-75">Formulating personalized Socratic follow-ups...</p>
              </>
            )}
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    const isApiError = error.includes("couldn't load your results");
    return (
      <div className="bg-[#020617] text-[#dae2fd] font-sans min-h-screen flex flex-col items-center justify-center antialiased">
        <div className="glass-card rounded-2xl p-8 max-w-md w-full text-center border border-red-500/20 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-red-500"></div>
          <span className="material-symbols-outlined text-red-500 text-4xl mb-4" style={{ fontVariationSettings: "'FILL' 1" }}>error</span>
          <h2 className="text-lg font-bold text-white mb-2">{isApiError ? 'Connection Error' : 'Error'}</h2>
          <p className="text-sm text-gray-400 mb-6 leading-relaxed">{error}</p>
          <div className="flex justify-center gap-4">
            {isApiError && (
              <button 
                onClick={fetchResultsData}
                className="bg-brand-purple hover:bg-brand-purple-light text-white text-xs font-semibold px-6 py-2.5 rounded-full transition-all duration-100 glow-primary active:scale-95 shadow-md"
              >
                Try Again
              </button>
            )}
            <button 
              onClick={() => {
                resetFlow()
                navigate('/')
              }}
              className="bg-[#140e28] hover:bg-brand-border text-gray-300 text-xs font-semibold px-6 py-2.5 rounded-full transition-all duration-100 active:scale-95 border border-brand-border"
            >
              Start New Assessment
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Statistics variables are now declared at the top of the component

  const totalTurns = chatHistory ? chatHistory.filter(m => m.role === 'user').length : 5
  const strongConcepts = userModel.filter(c => c.confidence >= 0.7)
  // const weakConcepts = userModel.filter(c => c.confidence > 0.0 && c.confidence < 0.7)
  const blindSpots = userModel.filter(c => c.confidence < 0.4)

  // Overall Score
  const exploredCount = userModel.length
  const overallScore = exploredCount > 0 
    ? Math.round((userModel.reduce((sum, curr) => sum + curr.confidence, 0) / exploredCount) * 100) 
    : 75

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

  const handleNodeSelect = (node) => {
    const modelState = userModel.find(item => item.id === node.id)
    const confidence = modelState ? modelState.confidence : 0
    const evidence = modelState ? modelState.evidence : 'No diagnostics available'

    const matchedQuestion = questions.find(q => q.concept === node.id || q.gap === node.id || (q.label && q.label.toLowerCase() === node.label.toLowerCase()))

    const gapInfo = rankedGaps.find(g => g.concept === node.id)
    const priority = gapInfo ? gapInfo.priority : null
    
    const pathInfo = learningPath.find(p => p.concept === node.id || (p.label && p.label.toLowerCase() === node.label.toLowerCase()))
    const sequenceOrder = pathInfo ? pathInfo.order : null

    setSelectedNode({
      ...node,
      confidence,
      evidence,
      priority,
      sequenceOrder,
      question: matchedQuestion ? matchedQuestion.question : null,
      questionWhy: matchedQuestion ? (matchedQuestion.why_this_matters || matchedQuestion.intent) : null
    })
    setIsDrawerOpen(true)
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
        
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(16px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-card-in {
          opacity: 0;
          animation: fadeInUp 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        .drawer-transition {
          transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.3s ease;
        }
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
            Here's your Socratic understanding report for <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-purple-light to-brand-accent">{finalTopic}</span>
          </h1>
        </div>

        {/* Summary Stats Grid */}
        <section className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-5 w-full">
          {/* Overall Understanding */}
          <div className="glass-card rounded-2xl p-5 flex flex-col items-center md:items-start gap-4 animate-card-in" style={{ animationDelay: '100ms' }}>
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
          <div className="glass-card rounded-2xl p-5 flex flex-col gap-2 justify-between animate-card-in" style={{ animationDelay: '200ms' }}>
            <div className="flex items-center gap-1.5 text-[10px] font-semibold text-gray-400 uppercase tracking-widest">
              <span className="material-symbols-outlined text-brand-purple-light text-sm">forum</span>
              Socratic Turns
            </div>
            <div>
              <div className="text-3xl font-bold text-white">{totalTurns} <span className="text-gray-500 text-sm">/ 5</span></div>
              <div className="text-[10px] text-brand-purple-light mt-1">Interactions Complete</div>
            </div>
          </div>

          {/* Mastered Concepts */}
          <div className="glass-card rounded-2xl p-5 flex flex-col gap-2 justify-between animate-card-in" style={{ animationDelay: '300ms' }}>
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
          <div className="glass-card rounded-2xl p-5 flex flex-col gap-2 justify-between border-red-500/20 relative overflow-hidden animate-card-in" style={{ animationDelay: '400ms' }}>
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
        <div className="flex flex-col gap-8">
          
          {/* Concept Map visualizer */}
          <div className="glass-card rounded-2xl p-6 flex flex-col justify-between min-h-[380px] animate-card-in" style={{ animationDelay: '500ms' }}>
            <div>
              <h2 className="text-lg font-bold text-white mb-1">Concept Dependency Map</h2>
              <p className="text-[11px] text-gray-500">
                Visual structure showing unlock scores and prerequisite links. Pulsing nodes require focus.
              </p>
            </div>
            
            {/* Visual Node Network */}
            <div className="flex-grow flex items-center justify-center border border-dashed border-brand-border/40 rounded-xl bg-brand-dark/30 my-4 relative overflow-hidden min-h-[400px]">
              <svg ref={svgRef} className="w-full h-full block"></svg>
            </div>

            <div className="flex gap-4 items-center justify-center text-[10px] text-gray-400">
              <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-brand-emerald"></span>Mastered (&ge;70%)</div>
              <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-brand-purple"></span>Partial (40-69%)</div>
              <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-500"></span>Incomplete (1-39%)</div>
              <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>Unexplored / Gap</div>
            </div>
          </div>

          {/* Section 1 — Blind Spot Questions */}
          <div className="flex flex-col gap-6 animate-card-in" style={{ animationDelay: '600ms' }}>
            <div className="glass-card rounded-2xl p-6 flex-grow flex flex-col gap-4">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                Your Top Blind Spots
                <span className="text-[9px] uppercase bg-red-500/10 text-red-400 px-2 py-0.5 rounded border border-red-500/20 font-semibold">{questions.length} Questions</span>
              </h2>
              <p className="text-[11px] text-gray-500">
                Top queries to test yourself, designed to unlock dependencies.
              </p>

              <div className="space-y-3 max-h-[260px] overflow-y-auto pr-1">
                {questions && questions.length > 0 ? (
                  questions.map((q, idx) => {
                    return (
                      <div 
                        key={q.concept || idx} 
                        className="bg-[#0b0f19] border border-brand-border/40 hover:border-brand-purple/45 rounded-xl p-3.5 transition-all animate-card-in"
                        style={{ animationDelay: `${700 + idx * 100}ms` }}
                      >
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-[9px] bg-brand-purple/10 text-brand-purple-light px-1.5 py-0.5 rounded border border-brand-purple/20 font-bold uppercase">Question {String(idx + 1).padStart(2, '0')}</span>
                          <span className="text-[9px] text-red-400 bg-red-500/10 px-1.5 py-0.5 rounded font-semibold uppercase">{q.label}</span>
                        </div>
                        <p className="text-[12px] text-gray-100 leading-relaxed font-semibold mb-2">
                          {q.question}
                        </p>
                        <p className="text-[10px] text-gray-400">
                          <span className="font-bold text-brand-purple-light">Why this matters:</span> {q.why_this_matters}
                        </p>
                      </div>
                    )
                  })
                ) : (
                  <div className="text-center py-10 text-xs text-gray-500 italic">
                    No blind spot questions available.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Section 3 — Gap Summary */}
        <section className="glass-card rounded-2xl p-6 md:p-8 flex flex-col gap-5 w-full animate-card-in" style={{ animationDelay: '650ms' }}>
          <h2 className="text-lg font-bold text-white">Diagnosed Gaps</h2>
          <p className="text-[11px] text-gray-500 -mt-2">
            Knowledge gaps identified from your conversation, ranked by severity and priority.
          </p>
          <div className="flex flex-col gap-4 mt-2">
            {rankedGaps && rankedGaps.length > 0 ? (
              rankedGaps.map((gap, index) => {
                const priority = gap.priority
                let colorClass = 'text-yellow-500 border-yellow-500/20 bg-yellow-500/10'
                let barColor = 'bg-yellow-500'
                if (priority > 7) {
                  colorClass = 'text-red-500 border-red-500/20 bg-red-500/10 shadow-glow-error'
                  barColor = 'bg-red-500'
                } else if (priority >= 4) {
                  colorClass = 'text-amber-500 border-amber-500/20 bg-amber-500/10'
                  barColor = 'bg-amber-500'
                }

                return (
                  <div 
                    key={gap.concept || index} 
                    className="flex items-center gap-4 w-full animate-card-in"
                    style={{ animationDelay: `${800 + index * 100}ms` }}
                  >
                    <div className="w-1/4 text-xs font-semibold text-gray-300 truncate">{gap.label}</div>
                    <div className="flex-grow h-2.5 bg-black/40 rounded-full overflow-hidden border border-brand-border/20">
                      <div className={`h-full rounded-full transition-all duration-300 ${barColor}`} style={{ width: `${Math.max(priority * 10, 5)}%` }}></div>
                    </div>
                    <div className={`text-[10px] font-bold px-2 py-0.5 rounded border uppercase tracking-wider ${colorClass}`}>{priority}</div>
                  </div>
                )
              })
            ) : (
              <div className="text-center py-10 text-xs text-gray-500 italic">
                No significant gaps identified. Excellent!
              </div>
            )}
          </div>
        </section>

        {/* Section 2 — Learning Path */}
        <section className="glass-card rounded-2xl p-6 md:p-8 flex flex-col gap-5 w-full animate-card-in" style={{ animationDelay: '700ms' }}>
          <h2 className="text-lg font-bold text-white">Your Learning Path</h2>
          <p className="text-[11px] text-gray-500 -mt-2">
            We've sorted your gaps topologically by their dependency hierarchy. Focus on these steps in order to unlock advanced topics.
          </p>

          <div className="relative flex flex-col gap-8 border-l border-brand-border/60 ml-4 pl-6 py-2">
            {learningPath && learningPath.length > 0 ? (
              learningPath.map((item, index) => {
                const unlocksText = Array.isArray(item.unlocks) ? item.unlocks.join(', ') : String(item.unlocks || '')
                return (
                  <div 
                    key={item.concept || index} 
                    className="relative w-full animate-card-in"
                    style={{ animationDelay: `${900 + index * 100}ms` }}
                  >
                    <div className="absolute -left-[37px] top-0 w-8 h-8 rounded-full border-2 border-brand-purple bg-[#0F172A] text-brand-purple-light flex items-center justify-center text-xs font-bold z-10 glow-primary">
                      {item.order || (index + 1)}
                    </div>
                    <h3 className="text-sm font-bold text-white">{item.label}</h3>
                    <p className="text-xs text-gray-400 mt-1 leading-relaxed">
                      Unlocks: <span className="text-gray-500 text-[11px]">{unlocksText || 'None'}</span>
                    </p>
                  </div>
                )
              })
            ) : (
              <div className="relative w-full animate-card-in" style={{ animationDelay: '900ms' }}>
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
          <button 
            onClick={() => setModalContent({ 
              title: 'Privacy Policy', 
              text: 'At BlindSpot AI, we prioritize your privacy. All Socratic dialogue messages, self-assessment explanations, and diagnostic maps are stored securely in our database. Your personal data is never sold or used for marketing purposes.' 
            })} 
            className="hover:text-brand-purple-light transition-colors cursor-pointer bg-transparent border-none p-0 text-left text-xs font-sans text-gray-500"
          >
            Privacy
          </button>
          <button 
            onClick={() => setModalContent({ 
              title: 'Terms of Service', 
              text: 'By using BlindSpot AI, you agree to participate in our Socratic assessments for learning purposes. The generated concept graphs and diagnostics are provided "as is" to help guide your studies.' 
            })} 
            className="hover:text-brand-purple-light transition-colors cursor-pointer bg-transparent border-none p-0 text-left text-xs font-sans text-gray-500"
          >
            Terms
          </button>
          <button 
            onClick={() => setModalContent({ 
              title: 'AI Model Ethics', 
              text: 'BlindSpot AI runs on Groq-hosted Llama open weights foundation models. We design our prompts following strict pedagogical guidelines, ensuring AI outputs are educational, supportive, and free of malicious bias.' 
            })} 
            className="hover:text-brand-purple-light transition-colors cursor-pointer bg-transparent border-none p-0 text-left text-xs font-sans text-gray-500"
          >
            AI Model Ethics
          </button>
        </div>
        <div>
          © 2026 BlindSpot. Digital Enlightenment.
        </div>
      </footer>

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
            className={`relative z-10 w-full sm:w-[420px] h-full bg-[#0B0F19]/95 backdrop-blur-2xl border-l border-brand-border/40 p-6 flex flex-col gap-6 shadow-[0_0_50px_rgba(0,0,0,0.8)] drawer-transition transform ${
              isDrawerOpen ? 'translate-x-0' : 'translate-x-full'
            }`}
          >
            {/* Close Button */}
            <button 
              onClick={() => setIsDrawerOpen(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-white bg-white/5 hover:bg-white/10 w-8 h-8 rounded-full flex items-center justify-center transition-all cursor-pointer"
            >
              <span className="material-symbols-outlined text-lg">close</span>
            </button>

            {/* Drawer Header */}
            <div className="pr-8">
              <span className="text-[10px] font-bold text-brand-purple-light uppercase tracking-widest">Concept Diagnostics</span>
              <h2 className="text-xl font-bold text-white mt-1 pr-4">{selectedNode.label}</h2>
            </div>

            <div className="flex flex-col gap-5 overflow-y-auto pr-1 pb-6">
              {/* Status Badge */}
              <div>
                <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">Understanding Level</div>
                {(() => {
                  const conf = selectedNode.confidence;
                  let badgeText = 'Mastered';
                  let badgeColor = 'text-brand-emerald border-brand-emerald/20 bg-brand-emerald/10 glow-emerald';
                  if (conf < 0.4) {
                    badgeText = 'Blind Spot';
                    badgeColor = 'text-red-500 border-red-500/20 bg-red-500/10 shadow-glow-error animate-pulse';
                  } else if (conf < 0.7) {
                    badgeText = 'Partial';
                    badgeColor = 'text-brand-purple border-brand-purple/20 bg-brand-purple/10 glow-primary';
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
                  <span className="text-xs font-bold text-brand-purple-light">{selectedNode.unlock_score || selectedNode.priority || 0} / 10</span>
                </div>
                <div className="w-full h-2.5 bg-black/40 rounded-full overflow-hidden border border-brand-border/20">
                  <div 
                    className="h-full rounded-full bg-gradient-to-r from-brand-purple to-brand-purple-light transition-all duration-500" 
                    style={{ width: `${((selectedNode.unlock_score || selectedNode.priority || 0) / 10) * 100}%` }}
                  ></div>
                </div>
                <span className="text-[10px] text-gray-500 mt-1 block">Higher scores indicate concept dependencies that unlock multiple downstream ideas.</span>
              </div>

              {/* Description */}
              {selectedNode.description && (
                <div className="bg-brand-card/40 border border-brand-border/30 rounded-xl p-3.5">
                  <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Concept Description</div>
                  <p className="text-xs text-gray-300 leading-relaxed">{selectedNode.description}</p>
                </div>
              )}

              {/* Diagnostic Evidence */}
              <div className="bg-[#0b0f19] border border-brand-border/40 rounded-xl p-3.5">
                <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">AI Diagnostic Evidence</div>
                <p className="text-xs text-gray-300 leading-relaxed italic">"{selectedNode.evidence}"</p>
              </div>

              {/* Learning Path Topological Order */}
              {selectedNode.sequenceOrder !== null && (
                <div className="flex items-center gap-3 bg-brand-purple/10 border border-brand-purple/20 rounded-xl p-3.5">
                  <div className="w-8 h-8 rounded-full bg-brand-purple text-white flex items-center justify-center text-xs font-bold flex-shrink-0 glow-primary">
                    {selectedNode.sequenceOrder}
                  </div>
                  <div>
                    <div className="text-[10px] font-bold text-brand-purple-light uppercase tracking-widest">Learning Path Order</div>
                    <p className="text-xs text-gray-300">This concept is step #{selectedNode.sequenceOrder} in your study plan.</p>
                  </div>
                </div>
              )}

              {/* Socratic Practice Question */}
              {selectedNode.question && (
                <div className="bg-gradient-to-br from-brand-purple/20 to-indigo-950/20 border border-brand-purple/40 rounded-xl p-4 flex flex-col gap-2.5">
                  <div className="flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-brand-purple-light text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>help</span>
                    <span className="text-[10px] font-bold text-brand-purple-light uppercase tracking-widest">Socratic practice question</span>
                  </div>
                  <p className="text-xs text-white font-bold leading-relaxed">{selectedNode.question}</p>
                  {selectedNode.questionWhy && (
                    <div className="text-[10.5px] text-gray-400">
                      <span className="font-bold text-brand-purple-light">Core Intent:</span> {selectedNode.questionWhy}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Details Modals (for Privacy, Terms, Ethics) */}
      {modalContent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
          <div className="bg-[#0B0F19] border border-brand-border/60 rounded-2xl max-w-md w-full p-6 relative shadow-2xl animate-card-in">
            <button 
              onClick={() => setModalContent(null)}
              className="absolute top-4 right-4 text-gray-400 hover:text-white bg-white/5 hover:bg-white/10 w-8 h-8 rounded-full flex items-center justify-center transition-all cursor-pointer"
            >
              <span className="material-symbols-outlined text-lg">close</span>
            </button>
            <h3 className="text-lg font-bold text-white mb-3">{modalContent.title}</h3>
            <p className="text-xs text-gray-300 leading-relaxed mb-4">{modalContent.text}</p>
            <div className="flex justify-end">
              <button 
                onClick={() => setModalContent(null)}
                className="bg-brand-purple hover:bg-brand-purple-light text-white text-xs font-semibold px-4 py-2 rounded-full cursor-pointer transition-all active:scale-95 glow-primary"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
