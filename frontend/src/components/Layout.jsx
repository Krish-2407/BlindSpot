import React from 'react'

export default function Layout({ children }) {
  return (
    <div className="min-h-screen bg-[#020617] text-gray-100 flex flex-col selection:bg-brand-purple/30">
      {children}
    </div>
  )
}
