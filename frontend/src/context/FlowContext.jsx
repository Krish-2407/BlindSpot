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

  // Helper to save a session to the local history list
  const saveSessionToHistory = useCallback((id, topic) => {
    if (!id || !topic) return;
    try {
      const historyJson = localStorage.getItem('blindspot_sessions_history');
      let historyList = historyJson ? JSON.parse(historyJson) : [];
      
      // Remove any existing duplicate
      historyList = historyList.filter(item => item.sessionId !== id);
      
      // Prepend newest session to the top
      historyList.unshift({
        sessionId: id,
        topic: topic,
        timestamp: new Date().toISOString()
      });
      
      // Keep only the 5 most recent sessions
      historyList = historyList.slice(0, 5);
      
      localStorage.setItem('blindspot_sessions_history', JSON.stringify(historyList));
    } catch (err) {
      console.warn('Failed to save session to local storage history:', err);
    }
  }, []);

  // Wrapped state setters that keep localStorage in sync
  const setSessionId = useCallback((id) => {
    setSessionIdState(id)
    if (id) {
      localStorage.setItem('blindspot_session_id', id)
      // Save topic to history listing as well if it's already active
      if (activeTopic) {
        saveSessionToHistory(id, activeTopic);
      }
    } else {
      localStorage.removeItem('blindspot_session_id')
    }
  }, [activeTopic, saveSessionToHistory]);

  const setActiveTopic = useCallback((topic) => {
    setActiveTopicState(topic)
    if (topic) {
      localStorage.setItem('blindspot_topic', topic)
      // Save to history listing if sessionId is already active
      if (sessionId) {
        saveSessionToHistory(sessionId, topic);
      }
    } else {
      localStorage.removeItem('blindspot_topic')
    }
  }, [sessionId, saveSessionToHistory]);

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

  // Resume a session from backend database payload
  const resumeSession = useCallback((sessionData) => {
    if (!sessionData || !sessionData.sessionId) return;
    
    setSessionIdState(sessionData.sessionId);
    setActiveTopicState(sessionData.topic);
    setMasterGraphState(sessionData.expertGraph);
    setChatHistoryState(sessionData.chatHistory || []);
    
    // Write directly to local storage to persist the active state
    localStorage.setItem('blindspot_session_id', sessionData.sessionId);
    localStorage.setItem('blindspot_topic', sessionData.topic);
    localStorage.setItem('blindspot_expert_graph', JSON.stringify(sessionData.expertGraph));
    localStorage.setItem('blindspot_chat_history', JSON.stringify(sessionData.chatHistory || []));

    // Save/Bump to the top of the history list
    saveSessionToHistory(sessionData.sessionId, sessionData.topic);
  }, [saveSessionToHistory]);

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
    resumeSession,
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
