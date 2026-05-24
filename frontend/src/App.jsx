import React, { useState } from 'react'

function App() {
  const [count, setCount] = useState(0)

  return (
    <div className="min-h-screen bg-brand-dark text-gray-100 flex flex-col justify-between p-6 md:p-12 selection:bg-brand-purple selection:text-white">
      {/* Header */}
      <header className="max-w-6xl mx-auto w-full flex items-center justify-between py-4 border-b border-brand-border/40">
        <div className="flex items-center space-x-3">
          <span className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            BlindSpot <span className="text-brand-purple">🔦</span>
          </span>
        </div>
        <span className="text-xs uppercase tracking-widest text-brand-purple font-semibold bg-brand-purple/10 px-3 py-1.5 rounded-full border border-brand-purple/20">
          Agent Scaffolding
        </span>
      </header>

      {/* Hero Section */}
      <main className="max-w-4xl mx-auto w-full my-auto flex flex-col items-center text-center space-y-8 py-12">
        <div className="space-y-4">
          <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight text-white leading-none">
            Find the <span className="bg-gradient-to-r from-brand-purple to-brand-accent bg-clip-text text-transparent">unknown unknowns</span> in your learning
          </h1>
          <p className="text-lg md:text-xl text-gray-400 max-w-2xl mx-auto font-light">
            BlindSpot maps what you actually understand against what an expert knows. Ready to uncover your blind spots?
          </p>
        </div>

        {/* Custom Glowing Card */}
        <div className="w-full max-w-md bg-brand-card border border-brand-border rounded-2xl p-8 shadow-glow-purple transition-all duration-300 hover:border-brand-purple/50">
          <h2 className="text-xl font-bold text-white mb-2">Test Your Understanding</h2>
          <p className="text-sm text-gray-400 mb-6 font-light">
            Interactive micro-animation test. Click the button below to trigger visual feedback states.
          </p>
          
          <div className="flex flex-col items-center gap-4">
            <button
              onClick={() => setCount((c) => c + 1)}
              className="px-6 py-3 bg-brand-purple text-white font-medium rounded-lg shadow-md hover:bg-brand-purple-light transition-all duration-200 active:scale-95 hover:shadow-glow-purple"
            >
              Glow Pulse: {count}
            </button>

            {/* Glowing Accent Badges */}
            <div className="flex flex-wrap justify-center items-center gap-3 mt-2">
              <span className="flex items-center gap-1.5 text-xs text-brand-emerald bg-brand-emerald/10 px-3 py-1 rounded-full border border-brand-emerald/20 shadow-glow-emerald">
                <span className="w-1.5 h-1.5 rounded-full bg-brand-emerald animate-pulse"></span>
                Tailwind CSS Integrated
              </span>
              <span className="flex items-center gap-1.5 text-xs text-brand-accent bg-brand-accent/10 px-3 py-1 rounded-full border border-brand-accent/20">
                React v19
              </span>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="max-w-6xl mx-auto w-full text-center py-6 border-t border-brand-border/40 text-xs text-gray-500">
        <p>© 2026 BlindSpot. Powered by Gemini API & Tailwind CSS.</p>
      </footer>
    </div>
  )
}

export default App
