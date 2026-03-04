import React from 'react'
import ReactDOM from 'react-dom/client'
import Dashboard from './components/Dashboard'
import './globals.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <main className="min-h-screen w-full bg-black text-white">
      <Dashboard />
    </main>
  </React.StrictMode>,
)
