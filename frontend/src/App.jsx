import React from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { FlowProvider } from './context/FlowContext'
import Layout from './components/Layout'
import Home from './pages/Home'
import Conversation from './pages/Conversation'
import Results from './pages/Results'

function App() {
  return (
    <FlowProvider>
      <Router>
        <Layout>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/conversation" element={<Conversation />} />
            <Route path="/results" element={<Results />} />
          </Routes>
        </Layout>
      </Router>
    </FlowProvider>
  )
}

export default App
