import React, { useCallback, useEffect, useState } from 'react'
import QRCode from 'react-qr-code'
import { supabase } from '../lib/supabaseClient'
import { API_BASE_URL } from '../lib/api'

export default function StudentView({ profile }) {
  const [studentProfile, setStudentProfile] = useState(null)
  const [studentId, setStudentId] = useState('')
  const [fullName, setFullName] = useState('')
  const [department, setDepartment] = useState('')
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
      .select('id, email, role, student_id, full_name, department')
      .eq('id', profile.id)
      .maybeSingle()
    if (error) setErrorMessage(error.message)
    else if (data) {
      setStudentProfile(data)
      setStudentId(data.student_id || '')
      setFullName(data.full_name || profile.user_metadata?.full_name || '')
      setDepartment(data.department || profile.user_metadata?.department || '')
    }
    setIsLoading(false)
  }, [profile])

  useEffect(() => { loadProfile() }, [loadProfile])

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
      department: department.trim() || null
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

  return (
    <main className="app-shell container student-portal">
      <header className="student-header">
        <div>
          <p className="login-kicker">SECURE ATTENDANCE PORTAL</p>
          <h1>Student Portal</h1>
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
            <label className="form-field form-field-wide"><span>Department</span><input value={department} onChange={(event) => setDepartment(event.target.value)} maxLength={160} /></label>
            <button className="neon-button primary form-field-wide" type="submit" disabled={isSaving}>{isSaving ? 'Saving…' : 'Save profile'}</button>
          </form>
        </section>
      ) : (
        <section className="card student-qr-card">
          <div>
            <h2>Your attendance QR</h2>
            <p className="muted-text">{studentProfile.full_name} · {studentProfile.student_id}{studentProfile.department ? ` · ${studentProfile.department}` : ''}</p>
          </div>
          {errorMessage && <p className="status-message error" role="alert">{errorMessage}</p>}
          {message && <p className="status-message" role="status">{message}</p>}
          {qrToken ? (
            <div className="student-qr-code"><QRCode value={qrToken} size={240} /></div>
          ) : <div className="qr-placeholder">{isGenerating ? 'Generating your QR…' : 'Your QR is not available yet.'}</div>}
          <p className="muted-text">This signed QR expires after 12 hours. Refresh it before the next event if needed.</p>
          <button className="neon-button primary" type="button" onClick={generateQr} disabled={isGenerating}>
            {isGenerating ? 'Generating…' : 'Refresh QR'}
          </button>
          <button className="text-button" type="button" onClick={() => { setStudentProfile(null); setMessage('') }}>Edit profile</button>
        </section>
      )}
    </main>
  )
}
