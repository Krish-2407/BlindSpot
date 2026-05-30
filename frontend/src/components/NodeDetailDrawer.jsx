import React from 'react'

export default function NodeDetailDrawer({ isOpen, onClose, node, mode = 'results' }) {
  if (!node) return null

  const isResultsMode = mode === 'results'

  // Mode-conditional styling
  const widthClass = isResultsMode ? 'sm:w-[420px] gap-6' : 'sm:w-[380px] gap-5'
  const titleText = isResultsMode ? 'Concept Diagnostics' : 'Concept Details'
  const headingClass = isResultsMode ? 'text-xl pr-4' : 'text-lg'

  // Confidence / Badge logic
  const conf = node.confidence || 0
  let badgeText = 'Mastered'
  let badgeColor = isResultsMode 
    ? 'text-brand-emerald border-brand-emerald/20 bg-brand-emerald/10 glow-emerald' 
    : 'text-brand-emerald border-brand-emerald/20 bg-brand-emerald/10'

  if (conf < 0.4) {
    if (isResultsMode) {
      badgeText = 'Blind Spot'
      badgeColor = 'text-red-500 border-red-500/20 bg-red-500/10 shadow-glow-error animate-pulse'
    } else {
      badgeText = conf === 0 ? 'Unexplored' : 'Weak'
      badgeColor = 'text-red-400 border-red-500/20 bg-red-500/10 animate-pulse'
    }
  } else if (conf < 0.7) {
    if (isResultsMode) {
      badgeText = 'Partial'
      badgeColor = 'text-brand-purple border-brand-purple/20 bg-brand-purple/10 glow-primary'
    } else {
      badgeText = 'Partial'
      badgeColor = 'text-brand-purple-light border-brand-purple/20 bg-brand-purple/10'
    }
  }

  // Unlock Score logic
  const unlockScore = isResultsMode ? (node.unlock_score || node.priority || 0) : (node.unlock_score || 0)
  const scoreBarHeight = isResultsMode ? 'h-2.5 bg-black/40' : 'h-2'
  const scoreHelpText = isResultsMode 
    ? 'Higher scores indicate concept dependencies that unlock multiple downstream ideas.'
    : 'Higher scores indicate concepts that unlock more downstream ideas.'

  // Description & Evidence titles
  const descriptionTitle = isResultsMode ? 'Concept Description' : 'AI Description'
  const evidenceTitle = isResultsMode ? 'AI Diagnostic Evidence' : 'Diagnostic Evidence'

  return (
    <div className={`fixed inset-0 z-50 flex justify-end transition-opacity duration-300 ${isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}>
      {/* Backdrop Overlay */}
      <div 
        onClick={onClose}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm cursor-pointer"
      />
      
      {/* Drawer Container */}
      <div 
        className={`relative z-10 w-full h-full bg-[#0B0F19]/95 backdrop-blur-2xl border-l border-brand-border/40 p-6 flex flex-col shadow-[0_0_50px_rgba(0,0,0,0.8)] drawer-transition transform ${widthClass} ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Close Button */}
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-white bg-white/5 hover:bg-white/10 w-8 h-8 rounded-full flex items-center justify-center transition-all cursor-pointer"
        >
          {isResultsMode ? (
            <span className="material-symbols-outlined text-lg">close</span>
          ) : (
            <i className="fa-solid fa-xmark text-sm"></i>
          )}
        </button>

        {/* Drawer Header */}
        <div className="pr-8">
          <span className="text-[10px] font-bold text-brand-purple-light uppercase tracking-widest">{titleText}</span>
          <h2 className={`font-bold text-white mt-1 ${headingClass}`}>{node.label}</h2>
        </div>

        <div className="flex flex-col gap-5 overflow-y-auto pr-1 pb-6">
          {/* Status Badge */}
          <div>
            <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">Understanding Level</div>
            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-xs font-bold ${badgeColor}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${conf < 0.4 ? 'bg-red-500' : conf < 0.7 ? 'bg-brand-purple' : 'bg-brand-emerald'}`}></span>
              {badgeText} ({Math.round(conf * 100)}%)
            </span>
          </div>

          {/* Unlock Score */}
          <div>
            <div className="flex justify-between items-center mb-1.5">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Unlock Score</span>
              <span className="text-xs font-bold text-brand-purple-light">{unlockScore} / 10</span>
            </div>
            <div className={`w-full rounded-full overflow-hidden border border-brand-border/20 ${scoreBarHeight}`}>
              <div 
                className="h-full rounded-full bg-gradient-to-r from-brand-purple to-brand-purple-light transition-all duration-500" 
                style={{ width: `${(unlockScore / 10) * 100}%` }}
              ></div>
            </div>
            <span className="text-[10px] text-gray-500 mt-1 block">{scoreHelpText}</span>
          </div>

          {/* Description */}
          {node.description && (
            <div className="bg-brand-card/40 border border-brand-border/30 rounded-xl p-3.5">
              <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">{descriptionTitle}</div>
              <p className="text-xs text-gray-300 leading-relaxed">{node.description}</p>
            </div>
          )}

          {/* Diagnostic Evidence */}
          <div className="bg-[#0b0f19] border border-brand-border/40 rounded-xl p-3.5">
            <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">{evidenceTitle}</div>
            <p className="text-xs text-gray-300 leading-relaxed italic">"{node.evidence}"</p>
          </div>

          {/* Results Mode specific order and question */}
          {isResultsMode && node.sequenceOrder !== null && node.sequenceOrder !== undefined && (
            <div className="flex items-center gap-3 bg-brand-purple/10 border border-brand-purple/20 rounded-xl p-3.5">
              <div className="w-8 h-8 rounded-full bg-brand-purple text-white flex items-center justify-center text-xs font-bold flex-shrink-0 glow-primary">
                {node.sequenceOrder}
              </div>
              <div>
                <div className="text-[10px] font-bold text-brand-purple-light uppercase tracking-widest">Learning Path Order</div>
                <p className="text-xs text-gray-300">This concept is step #{node.sequenceOrder} in your study plan.</p>
              </div>
            </div>
          )}

          {isResultsMode && node.question && (
            <div className="bg-gradient-to-br from-brand-purple/20 to-indigo-950/20 border border-brand-purple/40 rounded-xl p-4 flex flex-col gap-2.5">
              <div className="flex items-center gap-1.5">
                <span className="material-symbols-outlined text-brand-purple-light text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>help</span>
                <span className="text-[10px] font-bold text-brand-purple-light uppercase tracking-widest">Socratic practice question</span>
              </div>
              <p className="text-xs text-white font-bold leading-relaxed">{node.question}</p>
              {node.questionWhy && (
                <div className="text-[10.5px] text-gray-400">
                  <span className="font-bold text-brand-purple-light">Core Intent:</span> {node.questionWhy}
                </div>
              )}
            </div>
          )}

          {/* Conversation Mode specific depth */}
          {!isResultsMode && node.depth && (
            <div className="flex items-center gap-2 text-[11px] text-gray-400">
              <i className="fa-solid fa-layer-group text-brand-purple-light text-xs"></i>
              <span>Depth Level: <span className="text-white font-semibold">{node.depth === 1 ? 'Basic' : node.depth === 2 ? 'Intermediate' : 'Advanced'}</span></span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
