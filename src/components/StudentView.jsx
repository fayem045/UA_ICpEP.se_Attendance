import React, { useCallback, useEffect, useState } from 'react'
import QRCode from 'react-qr-code'
import { supabase } from '../lib/supabaseClient'
import { API_BASE_URL } from '../lib/api'

function formatDate(value) {
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value))
}

export default function StudentView({ profile }) {
  const [studentProfile, setStudentProfile] = useState(null)
  const [studentId, setStudentId] = useState('')
  const [fullName, setFullName] = useState('')
  const [yearLevel, setYearLevel] = useState('')
  const [events, setEvents] = useState([])
  const [isLoadingEvents, setIsLoadingEvents] = useState(true)
  const [eventsError, setEventsError] = useState('')
  const [qrToken, setQrToken] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [message, setMessage] = useState('')

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
    }
    setIsLoading(false)
  }, [profile])

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

  const generateQr = useCallback(async () => {
    if (!studentProfile?.student_id) return
    setIsGenerating(true)
    setErrorMessage('')
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) throw new Error('Your session expired. Sign in again to get a QR code.')
      const response = await fetch(`${API_BASE_URL}/api/student/qr`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`
        }
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(data.message || 'QR code could not be generated.')
      setQrToken(data.qrToken)
    } catch (error) {
      setErrorMessage(error.message || 'QR code could not be generated.')
    } finally {
      setIsGenerating(false)
    }
  }, [studentProfile])

  useEffect(() => {
    if (studentProfile?.student_id) generateQr()
  }, [studentProfile?.student_id, generateQr])

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
    setMessage('Student profile saved. Your QR is ready.')
    setQrToken('')
  }

  async function signOut() {
    await supabase.auth.signOut()
    window.location.reload()
  }

  if (isLoading) return <main className="app-shell container"><div className="card">Loading student profile…</div></main>

  const profileComplete = Boolean(studentProfile?.student_id && studentProfile?.full_name)
  const sortedEvents = [...events].sort((first, second) => {
    const firstUpcoming = new Date(first.starts_at).getTime() >= Date.now()
    const secondUpcoming = new Date(second.starts_at).getTime() >= Date.now()
    if (firstUpcoming !== secondUpcoming) return firstUpcoming ? -1 : 1
    return new Date(first.starts_at).getTime() - new Date(second.starts_at).getTime()
  })

  return (
    <main className="app-shell container student-portal">
      <header className="student-header">
        <div>
          <p className="login-kicker">SECURE ATTENDANCE PORTAL</p>
          <h1>Student Dashboard</h1>
          <p className="muted-text">{profile.email}</p>
        </div>
        <button className="neon-button" type="button" onClick={signOut}>Sign out</button>
      </header>

      {!profileComplete ? (
        <section className="card student-profile-card">
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
              {qrToken ? (
                <div className="student-qr-code"><QRCode value={qrToken} size={240} /></div>
              ) : (
                <div className="qr-placeholder">{isGenerating ? 'Preparing your permanent QR…' : 'Your QR is not available yet.'}</div>
              )}
              <p className="muted-text">Use this QR for attendance at chapter events. It does not expire.</p>
              {!qrToken && (
                <button className="neon-button primary" type="button" onClick={generateQr} disabled={isGenerating}>
                  {isGenerating ? 'Preparing…' : 'Retry QR'}
                </button>
              )}
              <button className="text-button" type="button" onClick={() => { setStudentProfile(null); setMessage('') }}>Edit profile</button>
            </section>

            <section className="card student-events-card">
              <div className="section-heading-row">
                <div>
                  <h2 className="section-heading">Chapter events</h2>
                  <p className="muted-text">View upcoming and past events.</p>
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
          </div>
        </>
      )}
    </main>
  )
}
