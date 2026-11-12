import React, { useCallback, useEffect, useMemo, useState } from 'react'
import NavBar from '../components/NavBar'
import StatCard from '../components/StatCard'
import QRGenerator from '../components/QRGenerator'
import { supabase } from '../lib/supabaseClient'

function startOfMonth(date) {
  return new Date(date.getFullYear(), date.getMonth(), 1).toISOString()
}

function endOfMonth(date) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 1).toISOString()
}

function formatDate(value) {
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value))
}

export default function Dashboard({ profile, onNavigate }) {
  const [stats, setStats] = useState({ students: 0, faculty: 0, eventsThisMonth: 0, upcomingEvents: 0, attendanceRate: null, recentCount: 0 })
  const [upcomingEvents, setUpcomingEvents] = useState([])
  const [recentAttendance, setRecentAttendance] = useState([])
  const [recentNames, setRecentNames] = useState({})
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')

  const loadDashboard = useCallback(async () => {
    setIsLoading(true)
    setErrorMessage('')
    const now = new Date()
    const last30Days = new Date(now.getTime() - 30 * 86400000).toISOString()
    const [studentsResult, facultyResult, thisMonthResult, upcomingResult, upcomingCountResult, recentResult, totalRecentResult, presentRecentResult] = await Promise.all([
      supabase.from('students').select('id', { count: 'exact', head: true }),
      supabase.from('faculty').select('id', { count: 'exact', head: true }),
      supabase.from('events').select('id', { count: 'exact', head: true }).gte('starts_at', startOfMonth(now)).lt('starts_at', endOfMonth(now)),
      supabase.from('events').select('id, name, location, starts_at, ends_at').gte('starts_at', now.toISOString()).order('starts_at').limit(5),
      supabase.from('events').select('id', { count: 'exact', head: true }).gte('starts_at', now.toISOString()),
      supabase.from('attendances').select('id, student_id, event_name, scanned_at, status').gte('scanned_at', last30Days).order('scanned_at', { ascending: false }).limit(100),
      supabase.from('attendances').select('id', { count: 'exact', head: true }).gte('scanned_at', last30Days).in('status', ['Present', 'Late']),
      supabase.from('attendances').select('id', { count: 'exact', head: true }).gte('scanned_at', last30Days).in('status', ['Present', 'Late', 'Absent'])
    ])
    const failed = [studentsResult, facultyResult, thisMonthResult, upcomingResult, upcomingCountResult, recentResult, totalRecentResult, presentRecentResult].find((result) => result.error)
    if (failed) {
      setErrorMessage(failed.error.message)
      setIsLoading(false)
      return
    }

    const recent = recentResult.data || []
    const completed = presentRecentResult.count || 0
    const present = totalRecentResult.count || 0
    setStats({
      students: studentsResult.count || 0,
      faculty: facultyResult.count || 0,
      eventsThisMonth: thisMonthResult.count || 0,
      upcomingEvents: upcomingCountResult.count || 0,
      attendanceRate: completed ? Math.round((present / completed) * 100) : null,
      recentCount: recent.length
    })
    setUpcomingEvents(upcomingResult.data || [])
    setRecentAttendance(recent)

    const ids = [...new Set(recent.map((record) => record.student_id).filter(Boolean))]
    if (ids.length) {
      const { data, error } = await supabase.from('students').select('id, name').in('id', ids)
      if (error) setErrorMessage(error.message)
      else setRecentNames(Object.fromEntries((data || []).map((student) => [student.id, student.name])))
    } else setRecentNames({})
    setIsLoading(false)
  }, [])

  useEffect(() => { loadDashboard() }, [loadDashboard])

  const weeklyActivity = useMemo(() => {
    const days = Array.from({ length: 7 }, (_, index) => {
      const date = new Date()
      date.setHours(0, 0, 0, 0)
      date.setDate(date.getDate() - (6 - index))
      return { date, count: 0 }
    })
    for (const record of recentAttendance) {
      const date = new Date(record.scanned_at)
      date.setHours(0, 0, 0, 0)
      const day = days.find((item) => item.date.getTime() === date.getTime())
      if (day) day.count += 1
    }
    const max = Math.max(...days.map((day) => day.count), 1)
    return days.map((day) => ({ ...day, height: day.count ? Math.max(8, Math.round((day.count / max) * 100)) : 0 }))
  }, [recentAttendance])

  const totalMembers = stats.students + stats.faculty
  const cards = [
    { icon: '👥', value: totalMembers, label: 'Total members', trend: `${stats.students} students · ${stats.faculty} faculty` },
    { icon: '📅', value: stats.eventsThisMonth, label: 'Events this month', trend: 'Scheduled events' },
    { icon: '📈', value: stats.attendanceRate === null ? '—' : `${stats.attendanceRate}%`, label: 'Attendance rate', trend: 'Last 30 days' },
    { icon: '⏳', value: stats.upcomingEvents, label: 'Upcoming events', trend: 'Next events' }
  ]

  return (
    <div className="app-shell container">
      <NavBar chapter="ICpEP.UA Chapter" activePage="dashboard" onNavigate={onNavigate} profile={profile} />
      <div className="dashboard-header">
        <div className="header-left">
          <h1>Chapter Overview</h1>
          <p>Welcome back, {profile?.email || 'Admin'}.</p>
        </div>
        <div className="quick-actions">
          <button className="neon-button primary" type="button" onClick={() => onNavigate?.('events')}>Create event</button>
          <button className="neon-button" type="button" onClick={() => onNavigate?.('attendance')}>Record attendance</button>
          <button className="neon-button" type="button" onClick={() => onNavigate?.('reports')}>View reports</button>
          <button className="neon-button" type="button" onClick={loadDashboard} disabled={isLoading}>{isLoading ? 'Refreshing…' : 'Refresh'}</button>
        </div>
      </div>

      {errorMessage && <p className="status-message error" role="alert">Could not load all dashboard data: {errorMessage}</p>}
      {isLoading && <p className="muted-text">Loading live chapter data…</p>}
      <div className="stats-grid">{cards.map((card) => <StatCard key={card.label} {...card} />)}</div>

      <div className="dashboard-content-grid dashboard-content-grid--analytics">
        <section className="card page-card">
          <h2 className="section-heading">Attendance activity · last 7 days</h2>
          <div className="weekly-chart" role="img" aria-label="Attendance records by day for the last seven days">
            {weeklyActivity.map((day) => (
              <div className="weekly-chart-day" key={day.date.toISOString()}>
                <div className="weekly-chart-track"><span style={{ height: `${day.height}%` }} title={`${day.count} records`} /></div>
                <strong>{day.count}</strong>
                <small>{new Intl.DateTimeFormat(undefined, { weekday: 'short' }).format(day.date)}</small>
              </div>
            ))}
          </div>
          {!stats.recentCount && <p className="muted-text">No attendance records in the last 30 days.</p>}
        </section>

        <section className="card page-card">
          <div className="section-heading-row">
            <h2 className="section-heading">Upcoming events</h2>
            <button className="text-button" type="button" onClick={() => onNavigate?.('events')}>View all</button>
          </div>
          {upcomingEvents.length === 0 ? <p className="muted-text">No upcoming events. Create one in Events.</p> : (
            <div className="events-list">
              {upcomingEvents.map((event) => (
                <article className="event-item" key={event.id}>
                  <div>
                    <strong>{event.name}</strong>
                    <p className="muted-text">{formatDate(event.starts_at)}{event.location ? ` · ${event.location}` : ''}</p>
                  </div>
                  <button className="text-button" type="button" onClick={() => onNavigate?.('attendance')}>Take attendance</button>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>

      <div className="dashboard-content-grid dashboard-content-grid--activity">
        <section className="card page-card">
          <div className="section-heading-row">
            <h2 className="section-heading">Recent attendance</h2>
            <button className="text-button" type="button" onClick={() => onNavigate?.('attendance')}>Manage</button>
          </div>
          {recentAttendance.length === 0 ? <p className="muted-text">No recent attendance activity.</p> : (
            <div className="table-scroll">
              <table className="table data-table">
                <thead><tr><th>Student</th><th>Event</th><th>Time</th><th>Status</th></tr></thead>
                <tbody>{recentAttendance.slice(0, 10).map((record) => (
                  <tr key={record.id}>
                    <td>{recentNames[record.student_id] || record.student_id || '—'}</td>
                    <td>{record.event_name || 'General Assembly'}</td>
                    <td>{formatDate(record.scanned_at)}</td>
                    <td><span className={`badge ${String(record.status || 'Present').toLowerCase()}`}>{record.status || 'Present'}</span></td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
          )}
        </section>

        <section className="card page-card">
          <h2 className="section-heading">Member QR generator</h2>
          <p className="muted-text">Save a roster entry and preview a scannable QR.</p>
          <QRGenerator />
        </section>
      </div>
    </div>
  )
}
