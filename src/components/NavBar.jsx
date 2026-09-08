import React from 'react'

export default function NavBar({ chapter='ICpEP.UA Chapter', activePage='dashboard', onNavigate }){
  const navigate = (event, page) => {
    event.preventDefault()
    onNavigate?.(page)
  }

  return (
    <div className="top-nav">
      <div className="brand">
        <img src="/assets/icpep-logo.png" alt="ICpEP logo" />
        <div>
          <div className="title">{chapter}</div>
          <div style={{fontSize:12,color:'var(--text-secondary)'}}>Computer Engineering Chapter</div>
        </div>
      </div>

      <nav className="nav-links">
        <a className={activePage === 'dashboard' ? 'active' : ''} href="#dashboard" onClick={(event) => navigate(event, 'dashboard')}>Dashboard</a>
        <a className={activePage === 'attendance' ? 'active' : ''} href="#attendance" onClick={(event) => navigate(event, 'attendance')}>Attendance</a>
        <a href="#events">Events</a>
        <a href="#members">Members</a>
        <a href="#reports">Reports</a>
      </nav>

      <div className="spacer" />

      <div style={{display:'flex',alignItems:'center'}}>
        <button className="icon-btn">🔔</button>
        <button className="icon-btn" style={{marginLeft:8}}>👤</button>
      </div>
    </div>
  )
}
