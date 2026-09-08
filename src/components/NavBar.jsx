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
        {/* to activate the buttons intoclickable */}
        <a className={activePage === 'events' ? 'active' : ''} href="#events" onClick={(event) => navigate(event, 'events')}>Events</a>
        <a className={activePage === 'members' ? 'active' : ''} href="#members" onClick={(event) => navigate (event, 'members')}>Members</a>
        <a className={activePage === 'reports' ? 'active' : ''} href="#reports" onClick={(event) => navigate(event, 'reports')}>Reports</a>
      </nav>

      <div className="spacer" />

      <div style={{display:'flex',alignItems:'center'}}>
        <button className="icon-btn">🔔</button>
        <button className="icon-btn" style={{marginLeft:8}}>👤</button>
      </div>
    </div>
  )
}
