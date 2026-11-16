import React, { useState } from 'react'
import logo from '../image/icpep-logo.png'
import bellIcon from '../image/bell.png'
import userIcon from '../image/user.png'
import { supabase } from '../lib/supabaseClient'

const pages = [
  ['dashboard', 'Dashboard'],
  ['attendance', 'Attendance'],
  ['events', 'Events'],
  ['members', 'Members'],
  ['reports', 'Reports']
]

export default function NavBar({ chapter = 'ICpEP.UA Chapter', activePage = 'dashboard', onNavigate, profile }) {
  const [accountOpen, setAccountOpen] = useState(false)
  const [isSigningOut, setIsSigningOut] = useState(false)

  function navigate(event, page) {
    event.preventDefault()
    setAccountOpen(false)
    onNavigate?.(page)
  }

  async function signOut() {
    setIsSigningOut(true)
    const { error } = await supabase.auth.signOut()
    setIsSigningOut(false)
    if (error) return
    window.location.reload()
  }

  return (
    <header className="top-nav">
      <a className="brand" href="#dashboard" onClick={(event) => navigate(event, 'dashboard')} aria-label="ICpEP.UA Chapter dashboard">
        <img id="brand-logo" src={logo} alt="ICpEP logo" />
        <span>
          <span className="title">{chapter}</span>
          <span className="brand-subtitle">Computer Engineering Chapter</span>
        </span>
      </a>

      <nav className="nav-links" aria-label="Admin navigation">
        {pages.map(([page, label]) => (
          <a
            className={activePage === page ? 'active' : ''}
            href={`#${page}`}
            key={page}
            aria-current={activePage === page ? 'page' : undefined}
            onClick={(event) => navigate(event, page)}
          >
            {label}
          </a>
        ))}
      </nav>

      <div className="spacer" />
      <div style={{display:'flex',alignItems:'center'}}>
        <button className="icon-btn">🔔</button>
        <button className="icon-btn" style={{marginLeft:8}}>👤</button>
      </div>
    </header>
  )
}
