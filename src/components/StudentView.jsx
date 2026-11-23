import React, { useCallback, useEffect, useState } from 'react'
import QRCode from 'react-qr-code'
import { supabase } from '../lib/supabaseClient'
import NavBar from './NavBar'

function formatDate(value) {
  if (!value) return 'Not scanned'
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value))
}

export default function StudentView({ profile }) {
  const [studentProfile, setStudentProfile] = useState(null)
  const [studentId, setStudentId] = useState('')
  const [fullName, setFullName] = useState('')
  const [yearLevel, setYearLevel] = useState('')
  const [attendanceRecords, setAttendanceRecords] = useState([])
  const [isLoadingAttendance, setIsLoadingAttendance] = useState(true)
  const [attendanceError, setAttendanceError] = useState('')
  const [events, setEvents] = useState([])
  const [isLoadingEvents, setIsLoadingEvents] = useState(true)
  const [eventsError, setEventsError] = useState('')
  const [activeNav, setActiveNav] = useState('dashboard')
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [message, setMessage] = useState('')

  const loadAttendance = useCallback(async (id) => {
    if (!id) {
      setAttendanceRecords([])
      setIsLoadingAttendance(false)
      return
    }
    setIsLoadingAttendance(true)
    setAttendanceError('')
    const { data, error } = await supabase
      .from('attendances')
      .select('id, event_id, event_name, scanned_at, status')
      .eq('student_id', id)
      .order('scanned_at', { ascending: false })
    if (error) {
      setAttendanceError(error.message)
      setAttendanceRecords([])
    } else setAttendanceRecords(data || [])
    setIsLoadingAttendance(false)
  }, [])

  const loadProfile = useCallback(async () => {
    setIsLoading(true)
    setErrorMessage('')
    const { data, error } = await supabase
      .from('profiles')
      .select('id, email, role, student_id, full_name, year_level')
      .eq('id', profile.id)
      .maybeSingle()
    if (error) setErrorMessage(error.message)
    else if (data) {
      setStudentProfile(data)
      setStudentId(data.student_id || '')
      setFullName(data.full_name || profile.user_metadata?.full_name || '')
      setYearLevel(data.year_level || profile.user_metadata?.year_level || profile.user_metadata?.department || '')
      await loadAttendance(data.student_id)
    }
    setIsLoading(false)
  }, [loadAttendance, profile])

  useEffect(() => { loadProfile() }, [loadProfile])

  const loadEvents = useCallback(async () => {
    setIsLoadingEvents(true)
    setEventsError('')
    const { data, error } = await supabase
      .from('events')
      .select('id, name, description, location, starts_at, ends_at')
      .order('starts_at', { ascending: true })
    if (error) {
      setEventsError(error.message)
      setEvents([])
    } else setEvents(data || [])
    setIsLoadingEvents(false)
  }, [])

  useEffect(() => {
    loadEvents()
    window.addEventListener('focus', loadEvents)
    return () => window.removeEventListener('focus', loadEvents)
  }, [loadEvents])

  useEffect(() => {
    const id = studentProfile?.student_id
    if (!id) return

    const channel = supabase
      .channel(`attendance-${id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'attendances', filter: `student_id=eq.${id}` },
        () => loadAttendance(id)
      )
      .subscribe()

    const onFocus = () => loadAttendance(id)
    window.addEventListener('focus', onFocus)

    return () => {
      supabase.removeChannel(channel)
      window.removeEventListener('focus', onFocus)
    }
  }, [studentProfile?.student_id, loadAttendance])

  async function saveProfile(event) {
    event.preventDefault()
    setIsSaving(true)
    setErrorMessage('')
    setMessage('')
    const values = {
      id: profile.id,
      email: profile.email,
      role: 'student',
      student_id: studentId.trim(),
      full_name: fullName.trim(),
      year_level: yearLevel.trim() || null
    }
    const { data, error } = await supabase.from('profiles').upsert(values, { onConflict: 'id' }).select().single()
    setIsSaving(false)
    if (error) {
      setErrorMessage(error.message)
      return
    }
    setStudentProfile(data)
    await loadAttendance(data.student_id)
    setMessage('Student profile saved. Your QR is ready.')
  }

  function navigate(page) {
    setActiveNav(page)
    if (page === 'attendance') {
      document.getElementById('student-attendance')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      return
    }
    if (page === 'events') {
      document.getElementById('student-events')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      return
    }
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const sortedEvents = [...events].sort((first, second) => {
    const firstUpcoming = new Date(first.starts_at).getTime() >= Date.now()
    const secondUpcoming = new Date(second.starts_at).getTime() >= Date.now()
    if (firstUpcoming !== secondUpcoming) return firstUpcoming ? -1 : 1
    return new Date(first.starts_at).getTime() - new Date(second.starts_at).getTime()
  })

  if (isLoading) {
    return (
      <main className="app-shell container">
        <NavBar
          activePage={activeNav}
          onNavigate={navigate}
          profile={profile}
          navigationPages={[['dashboard', 'Dashboard'], ['attendance', 'Attendance'], ['events', 'Events']]}
          navigationLabel="Student navigation"
          hideNotification
        />
        <div className="card">Loading student profile…</div>
      </main>
    )
  }

  const profileComplete = Boolean(studentProfile?.student_id && studentProfile?.full_name)

  return (
    <main className="app-shell container student-portal">
      <NavBar
        activePage={activeNav}
        onNavigate={navigate}
        profile={profile}
        navigationPages={[['dashboard', 'Dashboard'], ['attendance', 'Attendance'], ['events', 'Events']]}
        navigationLabel="Student navigation"
        hideNotification
      />

      {!profileComplete ? (
        <section id="student-dashboard" className="card student-profile-card">
          <h2>Complete your student profile</h2>
          <p className="muted-text">Add your member ID and name so attendance scans match your student record.</p>
          {errorMessage && <p className="status-message error" role="alert">{errorMessage}</p>}
          <form className="data-form" onSubmit={saveProfile}>
            <label className="form-field"><span>Student ID</span><input value={studentId} onChange={(event) => setStudentId(event.target.value)} maxLength={80} required /></label>
            <label className="form-field"><span>Full name</span><input value={fullName} onChange={(event) => setFullName(event.target.value)} maxLength={160} required /></label>
            <label className="form-field form-field-wide"><span>Year Level</span><input value={yearLevel} onChange={(event) => setYearLevel(event.target.value)} maxLength={160} /></label>
            <button className="neon-button primary form-field-wide" type="submit" disabled={isSaving}>{isSaving ? 'Saving…' : 'Save profile'}</button>
          </form>
        </section>
      ) : (
        <>
          <div className="student-dashboard-grid">
            <section className="card student-qr-card">
              <div>
                <h2>Your permanent attendance QR</h2>
                <p className="muted-text">{studentProfile.full_name} · {studentProfile.student_id}{studentProfile.year_level ? ` · ${studentProfile.year_level}` : ''}</p>
              </div>
              {errorMessage && <p className="status-message error" role="alert">{errorMessage}</p>}
              {message && <p className="status-message" role="status">{message}</p>}
              <div style={{ background: '#ffffff', padding: 20, borderRadius: 12, display: 'inline-block', lineHeight: 0 }}>
                <QRCode
                  value={String(studentProfile.student_id)}
                  size={240}
                  level="L"
                  bgColor="#ffffff"
                  fgColor="#000000"
                />
              </div>
              <p className="muted-text">Use this QR for attendance at chapter events. It does not expire.</p>
              <button className="text-button" type="button" onClick={() => { setStudentProfile(null); setMessage('') }}>Edit profile</button>
            </section>

            <section id="student-attendance" className="card student-events-card">
              <div className="section-heading-row">
                <div>
                  <h2 className="section-heading">My attendance</h2>
                  <p className="muted-text">View your chapter attendance records.</p>
                </div>
                <button className="text-button" type="button" onClick={() => loadAttendance(studentProfile.student_id)} disabled={isLoadingAttendance}>
                  {isLoadingAttendance ? 'Refreshing…' : 'Refresh'}
                </button>
              </div>
              {attendanceError && <p className="status-message error" role="alert">Could not load attendance: {attendanceError}</p>}
              {isLoadingAttendance ? <p className="muted-text">Loading attendance…</p> : attendanceRecords.length === 0 ? (
                <div className="empty-state">No attendance records yet.</div>
              ) : (
                <div className="table-wrap">
                  <table className="table data-table">
                    <thead>
                      <tr>
                        <th>Event</th>
                        <th>Date</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {attendanceRecords.map((record) => {
                        const status = record.status || 'Absent'
                        const statusClass = status.toLowerCase()
                    return (
                      <tr key={record.id}>
                        <td>{record.event_name || 'General Assembly'}</td>
                        <td>{formatDate(record.scanned_at)}</td>
                        <td><span className={`badge ${statusClass}`}>{status}</span></td>
                      </tr>
                    )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </div>
          <section id="student-events" className="card student-events-card student-events-full">
            <div className="section-heading-row">
              <div>
                <h2 className="section-heading">Chapter events</h2>
                <p className="muted-text">View upcoming and past chapter events.</p>
              </div>
              <button className="text-button" type="button" onClick={loadEvents} disabled={isLoadingEvents}>
                {isLoadingEvents ? 'Refreshing…' : 'Refresh'}
              </button>
            </div>
            {eventsError && <p className="status-message error" role="alert">Could not load events: {eventsError}</p>}
            {isLoadingEvents ? <p className="muted-text">Loading events…</p> : sortedEvents.length === 0 ? (
              <div className="empty-state">No events have been scheduled yet.</div>
            ) : (
              <div className="student-event-list">
                {sortedEvents.map((event) => {
                  const upcoming = new Date(event.starts_at).getTime() >= Date.now()
                  return (
                    <article className="student-event-item" key={event.id}>
                      <div className="student-event-heading">
                        <h3>{event.name}</h3>
                        <span className={`badge ${upcoming ? 'present' : 'late'}`}>{upcoming ? 'Upcoming' : 'Past'}</span>
                      </div>
                      <p className="muted-text">{formatDate(event.starts_at)}{event.ends_at ? ` – ${formatDate(event.ends_at)}` : ''}</p>
                      {event.location && <p>{event.location}</p>}
                      {event.description && <p className="event-description">{event.description}</p>}
                    </article>
                  )
                })}
              </div>
            )}
          </section>
        </>
      )}
    </main>
  )
}
