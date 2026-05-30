import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useFlow } from '../context/FlowContext'
import axios from 'axios'
import ConceptGraph from '../components/ConceptGraph'
import NodeDetailDrawer from '../components/NodeDetailDrawer'

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
  const [calibrationScore, setCalibrationScore] = useState(null)
  const [blindSpotScore, setBlindSpotScore] = useState(0)


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
      const fetchedCalibrationScore = agent3Res.data.calibrationScore || null
      const fetchedBlindSpotScore = agent3Res.data.blindSpotScore || 0

      setRankedGaps(fetchedRankedGaps)
      setCalibrationScore(fetchedCalibrationScore)
      setBlindSpotScore(fetchedBlindSpotScore)

      setLoadingStep('generating')

      // Call Agent 4 Socratic Output and Fetch Session details in parallel
      const [agent4Res, sessionRes] = await Promise.all([
        axios.post(`${API_URL}/api/agent4`, { sessionId }, { timeout: 30000 }),
        axios.get(`${API_URL}/api/session/${sessionId}`, { timeout: 30000 })
      ])

      const { questions: fetchedQuestions, learningPath: fetchedLearningPath } = agent4Res.data
      setQuestions(fetchedQuestions || [])
      setLearningPath(fetchedLearningPath || [])

      const fetchedRealUserModel = sessionRes.data.userModel || []
      setRealUserModel(fetchedRealUserModel)

      // Fallback: if session load returned cached properties, set them
      if (sessionRes.data.calibrationScore) {
        setCalibrationScore(sessionRes.data.calibrationScore)
      }
      if (sessionRes.data.blindSpotScore) {
        setBlindSpotScore(sessionRes.data.blindSpotScore)
      }

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

        {/* Advanced Diagnostics Section */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-5 w-full">
          {/* Blind Spot Score KPI Card */}
          <div className="glass-card rounded-2xl p-6 flex flex-col md:flex-row items-center justify-between gap-6 border-brand-purple/20 relative overflow-hidden animate-card-in" style={{ animationDelay: '450ms' }}>
            <div className="flex flex-col gap-2 min-w-0 flex-1 text-center md:text-left">
              <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Blind Spot Index</div>
              <h3 className="text-lg font-bold text-white">Critical Gap Severity</h3>
              <p className="text-xs text-gray-400 leading-relaxed mt-1">
                A weighted metric representing how critical and downstream your unaddressed knowledge gaps are.
              </p>
            </div>
            
            <div className="relative w-28 h-28 flex-shrink-0 flex items-center justify-center">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                <circle className="text-gray-800" cx="18" cy="18" r="16" fill="none" stroke="currentColor" strokeWidth="2.5"></circle>
                <circle 
                  className={`transition-all duration-1000 ${
                    blindSpotScore < 30 ? 'text-brand-emerald' : blindSpotScore < 70 ? 'text-brand-purple-light' : 'text-red-500 glow-error'
                  }`} 
                  cx="18" 
                  cy="18" 
                  r="16" 
                  fill="none" 
                  stroke="currentColor" 
                  strokeDasharray={`${blindSpotScore}, 100`} 
                  strokeWidth="3"
                ></circle>
              </svg>
              <div className="absolute flex flex-col items-center justify-center">
                <span className="text-2xl font-black text-white leading-none">{blindSpotScore}</span>
                <span className="text-[9px] text-gray-400 uppercase font-bold tracking-wider mt-0.5">Score</span>
              </div>
            </div>
          </div>

          {/* Confidence Calibration Card */}
          <div className={`glass-card rounded-2xl p-6 flex flex-col gap-3 justify-between relative overflow-hidden animate-card-in ${
            calibrationScore?.includes('Dunning-Kruger') ? 'border-red-500/20' : calibrationScore?.includes('Imposter') ? 'border-brand-purple/20' : 'border-brand-emerald/20'
          }`} style={{ animationDelay: '480ms' }}>
            {/* Top accent bar */}
            <div className={`absolute top-0 left-0 w-full h-1 ${
              calibrationScore?.includes('Dunning-Kruger') ? 'bg-red-500' : calibrationScore?.includes('Imposter') ? 'bg-brand-purple' : 'bg-brand-emerald'
            }`}></div>
            
            <div className="flex flex-col gap-1.5">
              <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Calibration Assessment</div>
              <h3 className="text-lg font-bold text-white">Mental Model Calibration</h3>
            </div>

            {calibrationScore ? (
              <div className="flex items-start gap-4 bg-white/5 border border-brand-border/40 p-4 rounded-xl">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                  calibrationScore.includes('Dunning-Kruger') ? 'bg-red-500/10 text-red-400 border border-red-500/20' :
                  calibrationScore.includes('Imposter') ? 'bg-brand-purple/10 text-brand-purple-light border border-brand-purple/20' :
                  'bg-brand-emerald/10 text-brand-emerald border border-brand-emerald/20'
                }`}>
                  {calibrationScore.includes('Dunning-Kruger') ? (
                    <span className="material-symbols-outlined text-xl">psychology_alt</span>
                  ) : calibrationScore.includes('Imposter') ? (
                    <span className="material-symbols-outlined text-xl">auto_awesome</span>
                  ) : (
                    <span className="material-symbols-outlined text-xl">verified</span>
                  )}
                </div>
                <div>
                  <h4 className={`text-sm font-bold ${
                    calibrationScore.includes('Dunning-Kruger') ? 'text-red-400' :
                    calibrationScore.includes('Imposter') ? 'text-brand-purple-light' :
                    'text-brand-emerald'
                  }`}>{calibrationScore}</h4>
                  <p className="text-xs text-gray-300 leading-relaxed mt-1">
                    {calibrationScore.includes('Dunning-Kruger') && 
                      "You estimated your understanding to be higher than demonstrated during Socratic dialogue. Focus on fundamentals and test your core assumptions."}
                    {calibrationScore.includes('Imposter') && 
                      "You demonstrated a deeper understanding than your initial self-assessment suggested. Trust your intuition more—you know this better than you think!"}
                    {calibrationScore.includes('Well-calibrated') && 
                      "Your self-assessment matches your Socratic performance perfectly. You have a highly accurate mental model of your knowledge boundaries."}
                  </p>
                </div>
              </div>
            ) : (
              <div className="text-xs text-gray-500 italic py-2 text-center">
                Calibration details will appear once analysis is complete.
              </div>
            )}
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
              <ConceptGraph graph={finalGraph} userModel={userModel} onNodeSelect={handleNodeSelect} topic={finalTopic} />
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
      <NodeDetailDrawer 
        isOpen={isDrawerOpen} 
        onClose={() => setIsDrawerOpen(false)} 
        node={selectedNode} 
        mode="results" 
      />

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
