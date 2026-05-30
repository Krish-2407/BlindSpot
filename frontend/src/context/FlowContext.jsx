import React, { createContext, useContext, useState, useCallback } from 'react'

const FlowContext = createContext(null)

export function FlowProvider({ children }) {
  const [activeScreen, setActiveScreenState] = useState('home')
  
  // Initialize state from localStorage to survive page refreshes
  const [sessionId, setSessionIdState] = useState(() => localStorage.getItem('blindspot_session_id'))
  const [activeTopic, setActiveTopicState] = useState(() => localStorage.getItem('blindspot_topic') || '')
  const [masterGraph, setMasterGraphState] = useState(() => {
    const saved = localStorage.getItem('blindspot_expert_graph')
    return saved ? JSON.parse(saved) : null
  })
  const [chatHistory, setChatHistoryState] = useState(() => {
    const saved = localStorage.getItem('blindspot_chat_history')
    return saved ? JSON.parse(saved) : []
  })

  // Helper to sync route changes with screen state
  const setActiveScreen = useCallback((screen) => {
    setActiveScreenState(screen)
  }, [])

  // Wrapped state setters that keep localStorage in sync
  const setSessionId = useCallback((id) => {
    setSessionIdState(id)
    if (id) {
      localStorage.setItem('blindspot_session_id', id)
    } else {
      localStorage.removeItem('blindspot_session_id')
    }
  }, [])

  const setActiveTopic = useCallback((topic) => {
    setActiveTopicState(topic)
    if (topic) {
      localStorage.setItem('blindspot_topic', topic)
    } else {
      localStorage.removeItem('blindspot_topic')
    }
  }, [])

  const setMasterGraph = useCallback((graph) => {
    setMasterGraphState(graph)
    if (graph) {
      localStorage.setItem('blindspot_expert_graph', JSON.stringify(graph))
    } else {
      localStorage.removeItem('blindspot_expert_graph')
    }
  }, [])

  const setChatHistory = useCallback((history) => {
    setChatHistoryState(history)
    if (history && history.length > 0) {
      localStorage.setItem('blindspot_chat_history', JSON.stringify(history))
    } else {
      localStorage.removeItem('blindspot_chat_history')
    }
  }, [])

  const resetFlow = useCallback(() => {
    setActiveScreenState('home')
    setSessionIdState(null)
    setActiveTopicState('')
    setMasterGraphState(null)
    setChatHistoryState([])
    localStorage.removeItem('blindspot_session_id')
    localStorage.removeItem('blindspot_topic')
    localStorage.removeItem('blindspot_expert_graph')
    localStorage.removeItem('blindspot_chat_history')
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
