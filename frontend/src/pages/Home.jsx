import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useFlow } from '../context/FlowContext'
import axios from 'axios'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000'

function transliterateDevanagari(text) {
  if (!text) return '';
  
  const map = {
    // Vowels (Independent)
    'अ': 'a', 'आ': 'aa', 'इ': 'i', 'ई': 'ee', 'उ': 'u', 'ऊ': 'oo', 'ऋ': 'ri',
    'ए': 'e', 'ऐ': 'ai', 'ओ': 'o', 'औ': 'au', 'अं': 'an', 'अः': 'ah',
    
    // Matras (Dependent Vowels)
    'ा': 'a', 'ि': 'i', 'ी': 'ee', 'ु': 'u', 'ू': 'oo', 'ृ': 'ri',
    'े': 'e', 'ै': 'ai', 'ो': 'o', 'ौ': 'au', 'ं': 'n', 'ः': 'h', 'ँ': 'n',
    
    // Consonants
    'क': 'ka', 'ख': 'kha', 'ग': 'ga', 'घ': 'gha', 'ङ': 'nga',
    'च': 'cha', 'छ': 'chha', 'ज': 'ja', 'झ': 'jha', 'ञ': 'nya',
    'ट': 'ta', 'ठ': 'tha', 'ड': 'da', 'ढ': 'dha', 'ण': 'na',
    'त': 'ta', 'थ': 'tha', 'द': 'da', 'ध': 'dha', 'न': 'na',
    'प': 'pa', 'फ': 'pha', 'ब': 'ba', 'भ': 'bha', 'म': 'ma',
    'य': 'ya', 'र': 'ra', 'ल': 'la', 'व': 'va', 'श': 'sha', 'ष': 'sha', 'स': 'sa', 'ह': 'ha',
    'क्ष': 'ksha', 'त्र': 'tra', 'ज्ञ': 'gya', 'ड़': 'd', 'ढ़': 'dh', 'ज़': 'z', 'फ़': 'f', 'ख़': 'kh', 'ग़': 'g',
    
    // Numbers
    '०': '0', '१': '1', '२': '2', '३': '3', '४': '4', '५': '5', '६': '6', '७': '7', '८': '8', '९': '9'
  };

  let result = '';
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const nextChar = text[i + 1] || '';
    
    let mapped = map[char];
    
    if (mapped) {
      const isConsonant = 'कखगघङचछजझञटठडढणतथदधनपफबभमयरलवशषसहक्षत्रज्ञड़ढ़ज़फ़ख़ग़'.includes(char);
      const isNextMatra = 'ािीुूृेैोौंःँ्'.includes(nextChar);
      const isNextSeparator = !nextChar || ' \t\n\r.,!?-()[]{}""\'\''.includes(nextChar);
      
      if (isConsonant) {
        if (isNextMatra) {
          if (nextChar === '्') {
            result += mapped.slice(0, -1);
            i++; 
            continue;
          } else {
            result += mapped.slice(0, -1) + map[nextChar];
            i++; 
            continue;
          }
        }
        if (isNextSeparator) {
          result += mapped.slice(0, -1);
          continue;
        }
      }
      result += mapped;
    } else {
      result += char;
    }
  }
  
  return result
    .replace(/aa+/g, 'a')
    .replace(/ee+/g, 'ee')
    .replace(/oo+/g, 'oo')
    .replace(/ae/g, 'e');
}

const DEMO_PROFILES = [
  {
    name: 'React Hooks Basics',
    topic: 'React Hooks',
    explanation: 'I understand that useState allows us to add state to functional components, and useEffect is for side effects. But I always get confused about dependency arrays, stale closures inside callbacks, and why we shouldn\'t call hooks conditionally.',
    colorClass: 'border-cyan-500/30 text-cyan-400 hover:border-cyan-400 hover:shadow-[0_0_12px_rgba(6,182,212,0.35)] hover:bg-cyan-950/20'
  },
  {
    name: 'Quantum Mechanics Intro',
    topic: 'Quantum Mechanics',
    explanation: 'I understand wave-particle duality and the Schrodinger equation, but quantum tunneling, superposition vs mixed states, and Bell\'s inequality are things I struggle to explain or visualize.',
    colorClass: 'border-purple-500/30 text-purple-400 hover:border-purple-400 hover:shadow-[0_0_12px_rgba(168,85,247,0.35)] hover:bg-purple-950/20'
  },
  {
    name: 'Git Internals',
    topic: 'Git Internals',
    explanation: 'I know git add and git commit, and how branches are pointers. But I do not understand how git represents tree and blob objects internally, how commits reference them, and how git resolves conflicts during a merge on a low level.',
    colorClass: 'border-orange-500/30 text-orange-400 hover:border-orange-400 hover:shadow-[0_0_12px_rgba(249,115,22,0.35)] hover:bg-orange-950/20'
  }
]

export default function Home() {
  const { setActiveTopic, setSessionId, setMasterGraph, setChatHistory, setActiveScreen, resumeSession } = useFlow()
  const [topic, setTopic] = useState('')
  const [explanation, setExplanation] = useState('')
  const [loading, setLoading] = useState(false)
  const [loadingStep, setLoadingStep] = useState('') // "mapping" or "diagnosing"
  const [error, setError] = useState('')
  const [sessionsHistory, setSessionsHistory] = useState([])
  const [isFlashed, setIsFlashed] = useState(false)
  const [modalContent, setModalContent] = useState(null)
  const navigate = useNavigate()

  useEffect(() => {
    try {
      const historyJson = localStorage.getItem('blindspot_sessions_history');
      if (historyJson) {
        setSessionsHistory(JSON.parse(historyJson));
      }
    } catch (err) {
      console.warn('Failed to load sessions history:', err);
    }
  }, []);

  const handleResume = async (id) => {
    setLoading(true);
    setError('');
    setLoadingStep('diagnosing');
    try {
      const response = await axios.get(`${API_URL}/api/session/${id}`, { timeout: 30000 });
      const sessionData = response.data;
      
      resumeSession(sessionData);
      
      if (sessionData.questions || sessionData.rankedGaps) {
        setActiveScreen('results');
        navigate('/results');
      } else {
        setActiveScreen('conversation');
        navigate('/conversation');
      }
    } catch (err) {
      console.error(err);
      setError('Failed to resume session. Please try again.');
    } finally {
      setLoading(false);
      setLoadingStep('');
    }
  };

  const [isListening, setIsListening] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(false);
  const [recognition, setRecognition] = useState(null);
  const [voiceLang, setVoiceLang] = useState('en-US');
  const [interimText, setInterimText] = useState('');

  // Initialize Speech Recognition on Mount / Lang change
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      setSpeechSupported(true);
      const rec = new SpeechRecognition();
      rec.continuous = true;
      rec.interimResults = true;
      rec.lang = voiceLang;

      rec.onresult = (event) => {
        let finalTranscript = '';
        let interimTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          let text = event.results[i][0].transcript;
          if (voiceLang === 'hi-IN') {
            text = transliterateDevanagari(text);
          }
          
          if (event.results[i].isFinal) {
            finalTranscript += text;
          } else {
            interimTranscript += text;
          }
        }

        if (finalTranscript) {
          setExplanation((prev) => {
            const separator = prev.trim() === '' ? '' : ' ';
            const updated = prev + separator + finalTranscript;
            return updated.slice(0, 10000); // Cap at max limit
          });
          setInterimText('');
        } else {
          setInterimText(interimTranscript);
        }
      };

      rec.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        setIsListening(false);
        setInterimText('');
      };

      rec.onend = () => {
        setIsListening(false);
        setInterimText('');
      };

      setRecognition(rec);

      return () => {
        try {
          rec.stop();
        } catch {
          // ignore if already stopped or not active
        }
      };
    }
  }, [voiceLang]);

  const toggleListening = () => {
    if (!recognition) return;
    if (isListening) {
      recognition.stop();
      setIsListening(false);
    } else {
      try {
        recognition.start();
        setIsListening(true);
      } catch (e) {
        console.error('Failed to start speech recognition:', e);
      }
    }
  };

  const handleSummarize = async () => {
    if (explanation.length <= 2000) return;
    setLoading(true);
    setError('');
    setLoadingStep('diagnosing');
    try {
      const response = await axios.post(`${API_URL}/api/summarize`, {
        text: explanation
      }, { timeout: 30000 });
      
      setExplanation(response.data.summary);
    } catch (err) {
      console.error(err);
      setError('Failed to summarize explanation. Please edit manually or try again.');
    } finally {
      setLoading(false);
      setLoadingStep('');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!topic.trim()) return

    setLoading(true)
    setError('')
    setLoadingStep('mapping')

    try {
      // Clear prior state and storage using context setters
      setChatHistory([])
      setSessionId(null)
      setActiveTopic('')
      setMasterGraph(null)
      localStorage.removeItem('blindspot_session_id')

      // Call Agent 1 to build the concept dependency graph
      const response = await axios.post(`${API_URL}/api/agent1`, {
        topic: topic.trim(),
        openingExplanation: explanation.trim()
      }, { timeout: 30000 })

      const { sessionId, expertGraph } = response.data
      
      // Capture expertGraph regardless of casing format from backend
      const graphData = expertGraph || response.data.expert_graph

      // Context setters will synchronously update state and localStorage
      setSessionId(sessionId)
      setActiveTopic(topic.trim())
      setMasterGraph(graphData)

      setActiveScreen('conversation')
      navigate('/conversation')
    } catch (err) {
      console.error(err)
      setError('Something went wrong. Please try again.')
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
        @keyframes wave-bounce {
          0%, 100% { transform: scaleY(0.35); }
          50% { transform: scaleY(1); }
        }
        .wave-bar {
          display: inline-block;
          transform-origin: bottom;
          animation: wave-bounce 0.8s ease-in-out infinite;
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
        
        @keyframes input-flash {
          0%, 100% { border-color: rgba(139, 92, 246, 0.15); box-shadow: none; }
          50% { border-color: rgba(168, 85, 247, 0.85); box-shadow: 0 0 15px rgba(168, 85, 247, 0.4); }
        }
        .animate-flash {
          animation: input-flash 0.8s ease-in-out;
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
            
            {/* Topic Input */}
            <div>
              <label className="block text-[12px] font-bold text-gray-300 uppercase tracking-widest mb-1.5 ml-0.5">Topic</label>
              <div className={`relative glass-input rounded-xl flex items-center p-1 transition-all duration-200 ${isFlashed ? 'animate-flash' : ''}`}>
                <div className="pl-3 pr-2 text-gray-500">
                  <i className="fa-solid fa-magnifying-glass text-xs"></i>
                </div>
                <input 
                  type="text"
                  required
                  disabled={loading}
                  value={topic}
                  onChange={(e) => setTopic(transliterateDevanagari(e.target.value))}
                  placeholder="e.g., React Closures, Git Internals, CSS Grid..." 
                  className="w-full bg-transparent border-none text-white placeholder-gray-500 focus:ring-0 text-sm py-2 px-1 focus:outline-none"
                />
              </div>
            </div>

            {/* Explanation Input */}
            <div>
              <div className="flex justify-between items-center mb-1.5 ml-0.5">
                <label className="block text-[12px] font-bold text-gray-300 uppercase tracking-widest">
                  Opening Explanation (Optional)
                </label>
                <div className="flex items-center gap-2">
                  {speechSupported && (
                    <select
                      value={voiceLang}
                      onChange={(e) => setVoiceLang(e.target.value)}
                      className="bg-[#0b071e] border border-brand-border/40 text-gray-400 text-[10px] rounded px-1.5 py-0.5 focus:outline-none cursor-pointer hover:text-white transition-colors"
                    >
                      <option value="en-US">English</option>
                      <option value="hi-IN">Hindi (हिन्दी)</option>
                    </select>
                  )}
                  <span className={`text-[10px] font-semibold ${explanation.length > 2000 ? 'text-red-400 font-extrabold' : 'text-gray-500'}`}>
                    {explanation.length} / 10,000
                  </span>
                </div>
              </div>
              <div className={`relative glass-input rounded-xl p-1 flex flex-col transition-all duration-200 ${isFlashed ? 'animate-flash' : ''}`}>
                <textarea 
                  rows="4"
                  maxLength={10000}
                  disabled={loading}
                  value={explanation + (interimText ? (explanation.trim() === '' ? '' : ' ') + interimText : '')}
                  onChange={(e) => setExplanation(transliterateDevanagari(e.target.value))}
                  placeholder="Explain what you understand. (Optional, up to 10k chars. Speak or type)" 
                  className="w-full bg-transparent border-none text-white placeholder-gray-500 focus:ring-0 text-sm resize-none p-1.5 leading-relaxed focus:outline-none pr-[80px]"
                />
                {/* Voice Dictation Microphone Trigger */}
                {speechSupported && (
                  <div className="absolute bottom-3 right-3 flex items-center gap-2">
                    {isListening && (
                      <div className="flex items-end gap-0.5 h-4 px-1.5 mb-1.5">
                        <span className="w-[2px] bg-red-500 wave-bar" style={{ animationDelay: '0s', height: '100%' }}></span>
                        <span className="w-[2px] bg-red-500 wave-bar" style={{ animationDelay: '0.2s', height: '60%' }}></span>
                        <span className="w-[2px] bg-red-500 wave-bar" style={{ animationDelay: '0.4s', height: '80%' }}></span>
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={toggleListening}
                      className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
                        isListening 
                          ? 'bg-red-650 text-white shadow-[0_0_12px_rgba(220,38,38,0.45)]' 
                          : 'bg-brand-card hover:bg-brand-border/40 text-gray-400 hover:text-white border border-brand-border/40'
                      }`}
                      title={isListening ? "Stop listening" : "Start speaking"}
                    >
                      <i className={`fa-solid ${isListening ? 'fa-microphone-slash text-xs' : 'fa-microphone text-xs'}`}></i>
                    </button>
                  </div>
                )}
              </div>
              
              {/* AI Summarization Banner */}
              {explanation.length > 2000 && (
                <div className="mt-2.5 bg-brand-purple/10 border border-brand-purple/20 rounded-xl p-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 animate-fade-in">
                  <div className="flex items-start gap-2">
                    <i className="fa-solid fa-circle-info text-brand-purple-light mt-0.5"></i>
                    <p className="text-[11px] text-gray-300 leading-relaxed max-w-[300px]">
                      Your explanation is very detailed. Condense it below 2,000 characters for optimal AI mapping.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleSummarize}
                    disabled={loading}
                    className="self-end sm:self-center px-3 py-1.5 rounded-lg bg-brand-purple text-white text-xs font-bold transition-all hover:bg-brand-purple-light active:scale-95 disabled:opacity-50 whitespace-nowrap"
                  >
                    <i className="fa-solid fa-wand-magic-sparkles mr-1.5"></i>
                    Summarize with AI
                  </button>
                </div>
              )}
            </div>

            {/* 1-Click Demo Profiles */}
            <div className="flex flex-col gap-2.5 mt-1">
              <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-widest ml-0.5">
                Quick Demo Profiles
              </label>
              <div className="flex flex-wrap gap-2">
                {DEMO_PROFILES.map((profile, idx) => (
                  <button
                    key={idx}
                    type="button"
                    disabled={loading}
                    onClick={() => {
                      if (isListening && recognition) {
                        recognition.stop();
                        setIsListening(false);
                      }
                      setInterimText('');
                      setTopic(profile.topic);
                      setExplanation(profile.explanation);
                      setIsFlashed(true);
                      setTimeout(() => setIsFlashed(false), 800);
                    }}
                    className={`px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all duration-200 active:scale-95 whitespace-nowrap cursor-pointer ${profile.colorClass} disabled:opacity-50 disabled:pointer-events-none`}
                  >
                    {profile.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Actions/Submit inside form for tighter alignment */}
            <div className="flex flex-col gap-3 mt-1">
              {explanation.length > 2000 && (
                <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 text-[11px] text-red-400 flex items-start gap-2 animate-pulse">
                  <i className="fa-solid fa-triangle-exclamation mt-0.5"></i>
                  <p>Submit is locked: Explanation must be under 2,000 characters. Please compress your explanation or click the "Summarize with AI" button above.</p>
                </div>
              )}
              <button
                type="submit"
                disabled={loading || !topic.trim() || explanation.length > 2000}
                className="group relative w-full overflow-hidden rounded-xl bg-gradient-to-r from-brand-purple to-indigo-600 p-[1px] transition-all hover:scale-[1.01] active:scale-95 shadow-[0_0_20px_rgba(139,92,246,0.2)] disabled:opacity-50 disabled:scale-100 disabled:shadow-none"
              >
                <div className="relative flex items-center justify-center gap-2 rounded-[11px] bg-gradient-to-r from-brand-purple to-indigo-600 px-6 py-2.5 transition-all group-hover:from-brand-purple-light group-hover:to-brand-purple-dark">
                  {loading ? (
                    <>
                      <div className="w-4 h-4 rounded-full border-2 border-white/20 border-t-white animate-spin"></div>
                      <span className="text-[15px] font-extrabold text-white">Building your knowledge map...</span>
                    </>
                  ) : (
                    <>
                      <i className="fa-solid fa-graduation-cap text-white text-xs"></i>
                      <span className="text-[15px] font-extrabold text-white">Reveal My Blind Spots</span>
                      <i className="fa-solid fa-arrow-right text-white text-xs transition-transform group-hover:translate-x-0.5"></i>
                    </>
                  )}
                </div>
              </button>

              {/* Error Message */}
              {error && (
                <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 text-[11px] text-red-400 flex items-start gap-2 animate-pulse">
                  <i className="fa-solid fa-triangle-exclamation mt-0.5"></i>
                  <p>{error}</p>
                </div>
              )}

              <div className="flex items-center justify-center gap-1 text-[10px] text-gray-500 font-semibold">
                <i className="fa-solid fa-circle-check text-brand-emerald"></i>
                <span>AI analyzes understanding across 100+ dimensions</span>
              </div>
            </div>
          </form>

          {/* Recent Sessions History Section */}
          {sessionsHistory.length > 0 && (
            <div className="w-full mt-6 bg-brand-card/30 backdrop-blur-xl border border-brand-border/30 rounded-2xl p-5 shadow-lg relative z-40">
              <h3 className="text-xs font-bold tracking-widest uppercase text-gray-400 mb-3 ml-0.5">
                Resume a Recent Session
              </h3>
              <div className="flex flex-col gap-2.5 max-h-[220px] overflow-y-auto pr-1">
                {sessionsHistory.map((item) => (
                  <button
                    key={item.sessionId}
                    type="button"
                    disabled={loading}
                    onClick={() => handleResume(item.sessionId)}
                    className="group relative flex items-center justify-between p-3 rounded-xl border border-brand-border/35 bg-brand-card/40 text-left transition-all hover:border-brand-purple/40 hover:bg-brand-card/75 disabled:opacity-50"
                  >
                    <div className="flex flex-col truncate pr-2">
                      <span className="text-sm font-bold text-white truncate max-w-[340px]">
                        {item.topic}
                      </span>
                      <span className="text-[10px] text-gray-500 font-semibold mt-0.5">
                        {new Date(item.timestamp).toLocaleDateString(undefined, {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 text-[11px] font-bold text-brand-purple-light opacity-80 group-hover:opacity-100 transition-opacity">
                      <span>Resume</span>
                      <i className="fa-solid fa-chevron-right text-[9px] transition-transform group-hover:translate-x-0.5"></i>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Footer Features (Typography scaled) */}
      <footer className="w-full max-w-[850px] px-4 pb-3 md:pb-6 z-20 flex flex-col items-center mt-2 gap-4">
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

        <div className="flex justify-between items-center w-full px-4 text-xs text-gray-500">
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
        </div>
      </footer>

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
