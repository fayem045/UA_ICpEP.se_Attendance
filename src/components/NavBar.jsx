import React from 'react'

export default function NavBar({ chapter='ICpEP.UA Chapter' }){
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
        <a className="active">Dashboard</a>
        <a>Attendance</a>
        <a>Events</a>
        <a>Members</a>
        <a>Reports</a>
      </nav>

      <div className="spacer" />

      <div style={{display:'flex',alignItems:'center'}}>
        <button className="icon-btn">🔔</button>
        <button className="icon-btn" style={{marginLeft:8}}>👤</button>
      </div>
    </div>
  )
}
