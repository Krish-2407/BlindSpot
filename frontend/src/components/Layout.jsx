import React from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useFlow } from '../context/FlowContext'

export default function Layout({ children }) {
  const { activeTopic, sessionId, resetFlow } = useFlow()
  const navigate = useNavigate()
  const location = useLocation()

  const handleLogoClick = (e) => {
    e.preventDefault()
    resetFlow()
    navigate('/')
  }

  // Determine active steps based on route path
  const currentPath = location.pathname
  const steps = [
    { name: 'Define Topic', active: currentPath === '/', done: currentPath !== '/' },
    { name: 'Socratic Chat', active: currentPath === '/conversation', done: currentPath === '/results' },
    { name: 'Gap Mapping', active: currentPath === '/results', done: false },
  ]

  return (
    <div className="min-h-screen bg-brand-dark text-gray-100 flex flex-col justify-between selection:bg-brand-purple selection:text-white relative overflow-hidden">
      {/* Background Gradient Orbs */}
      <div className="absolute top-[-10%] left-[-10%] w-[50vw] h-[50vw] rounded-full bg-brand-purple/5 blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[50vw] h-[50vw] rounded-full bg-brand-emerald/5 blur-[120px] pointer-events-none"></div>

      {/* Header */}
      <header className="sticky top-0 z-50 backdrop-blur-md bg-brand-dark/85 border-b border-brand-border/40 px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <a href="/" onClick={handleLogoClick} className="flex items-center space-x-3 group">
            <span className="text-2xl font-bold tracking-tight text-white flex items-center gap-2 group-hover:text-brand-purple transition-colors duration-200">
              BlindSpot <span className="text-brand-purple transition-transform duration-300 group-hover:rotate-12">🔦</span>
            </span>
          </a>

          {/* Active Session Badge */}
          {activeTopic && (
            <div className="hidden sm:flex items-center space-x-2 bg-brand-card/60 px-3 py-1.5 rounded-lg border border-brand-border/40 text-xs">
              <span className="text-gray-400">Topic:</span>
              <span className="font-semibold text-brand-purple-light max-w-[150px] truncate">{activeTopic}</span>
              {sessionId && <span className="w-1.5 h-1.5 rounded-full bg-brand-purple"></span>}
              {sessionId && <span className="text-gray-500 font-mono text-[10px]">#{sessionId.slice(0, 8)}</span>}
            </div>
          )}

          {/* Navigation Steps */}
          <nav className="flex items-center space-x-2 md:space-x-4">
            {steps.map((step, idx) => (
              <React.Fragment key={step.name}>
                {idx > 0 && <span className="text-gray-600 text-xs select-none">/</span>}
                <div
                  className={`text-xs md:text-sm font-medium transition-all duration-200 ${
                    step.active
                      ? 'text-brand-purple font-semibold'
                      : step.done
                      ? 'text-brand-emerald'
                      : 'text-gray-500'
                  }`}
                >
                  {step.name}
                </div>
              </React.Fragment>
            ))}
          </nav>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-grow max-w-6xl mx-auto w-full px-6 py-8 md:py-12 flex flex-col justify-center relative z-10">
        <div className="w-full bg-brand-card/45 backdrop-blur-xl border border-brand-border/60 rounded-3xl p-6 md:p-10 shadow-glow-purple transition-all duration-300">
          {children}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-brand-border/40 bg-brand-dark/40 px-6 py-6 text-center text-xs text-gray-500 relative z-10">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-2">
          <p>© 2026 BlindSpot. Finds the questions you never knew to ask.</p>
          <div className="flex items-center space-x-3">
            <span className="flex items-center gap-1 text-[11px] text-brand-emerald">
              <span className="w-1.5 h-1.5 rounded-full bg-brand-emerald animate-pulse"></span>
              API Integration Ready
            </span>
          </div>
        </div>
      </footer>
    </div>
  )
}
