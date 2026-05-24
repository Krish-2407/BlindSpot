import React, { createContext, useContext, useState, useCallback } from 'react'

const FlowContext = createContext(null)

export function FlowProvider({ children }) {
  const [activeScreen, setActiveScreenState] = useState('home')
  const [sessionId, setSessionId] = useState(null)
  const [activeTopic, setActiveTopic] = useState('')
  const [masterGraph, setMasterGraph] = useState(null)
  const [chatHistory, setChatHistory] = useState([])

  // Helper to sync route changes with screen state
  const setActiveScreen = useCallback((screen) => {
    setActiveScreenState(screen)
  }, [])

  const resetFlow = useCallback(() => {
    setActiveScreenState('home')
    setSessionId(null)
    setActiveTopic('')
    setMasterGraph(null)
    setChatHistory([])
  }, [])

  const value = {
    activeScreen,
    setActiveScreen,
    sessionId,
    setSessionId,
    activeTopic,
    setActiveTopic,
    masterGraph,
    setMasterGraph,
    chatHistory,
    setChatHistory,
    resetFlow
  }

  return (
    <FlowContext.Provider value={value}>
      {children}
    </FlowContext.Provider>
  )
}

export function useFlow() {
  const context = useContext(FlowContext)
  if (!context) {
    throw new Error('useFlow must be used within a FlowProvider')
  }
  return context
}
