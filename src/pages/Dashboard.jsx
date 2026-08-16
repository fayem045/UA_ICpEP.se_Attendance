import React from 'react'
import NavBar from '../components/NavBar'
import StatCard from '../components/StatCard'

export default function Dashboard({ profile }){
  // placeholder sample data
  const stats = [
    { icon:'👥', value: 128, label: 'Total Members', trend: '+4%' },
    { icon:'📅', value: 6, label: 'Events This Month', trend: '+1' },
    { icon:'📈', value: '92%', label: 'Attendance Rate', trend: '+2%' },
    { icon:'⏳', value: 3, label: 'Upcoming Events', trend: '-1' }
  ]

  const recent = [
    { member:'A. Santos', event:'Intro to FPGA', date:'2026-08-10', time:'09:05', status:'present' },
    { member:'B. Cruz', event:'Lab Session', date:'2026-08-10', time:'09:12', status:'late' },
    { member:'C. Reyes', event:'Seminar', date:'2026-08-09', time:'10:00', status:'absent' }
  ]

  return (
    <div className="app-shell container">
      <NavBar chapter="ICpEP.UA Chapter" />

      <div className="dashboard-header">
        <div className="header-left">
          <h1>Chapter Overview</h1>
          <p>Welcome back — {profile?.email || 'Admin'}. Academic Year 2026-2027 · Semester 1</p>
        </div>
        <div className="quick-actions">
          <button className="neon-button primary">Create Event</button>
          <button className="neon-button">Record Attendance</button>
          <button className="neon-button">View Reports</button>
        </div>
      </div>

      <div className="stats-grid">
        {stats.map((s, i) => <StatCard key={i} {...s} />)}
      </div>

      <div style={{display:'grid', gridTemplateColumns:'2fr 1fr', gap:14, marginTop:16}}>
        <div className="card">
          <h3 style={{marginTop:0}}>Attendance Analytics</h3>
          <div style={{height:260,display:'flex',alignItems:'center',justifyContent:'center',color:'var(--text-secondary)'}}>Chart placeholder (line/bar charts with cyan accents)</div>
        </div>

        <div className="card">
          <h3 style={{marginTop:0}}>Upcoming Events</h3>
          <div className="events-list">
            <div className="event-item">
              <div>
                <div style={{fontWeight:600}}>Robotics Workshop</div>
                <div style={{fontSize:12,color:'var(--text-secondary)'}}>Aug 25 · 2:00 PM · Lab 3</div>
              </div>
              <div style={{textAlign:'right'}}>
                <div style={{fontSize:13}}>45 registered</div>
                <button className="neon-button" style={{marginTop:8}}>View Event</button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="card" style={{marginTop:16}}>
        <h3 style={{marginTop:0}}>Recent Attendance Activity</h3>
        <table className="table" style={{width:'100%'}}>
          <thead>
            <tr><th>Member</th><th>Event</th><th>Date</th><th>Time</th><th>Status</th></tr>
          </thead>
          <tbody>
            {recent.map((r,i)=> (
              <tr key={i}>
                <td>{r.member}</td>
                <td>{r.event}</td>
                <td>{r.date}</td>
                <td>{r.time}</td>
                <td>{r.status === 'present' ? <span className="badge present">Present</span> : r.status === 'late' ? <span className="badge late">Late</span> : <span className="badge absent">Absent</span>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
