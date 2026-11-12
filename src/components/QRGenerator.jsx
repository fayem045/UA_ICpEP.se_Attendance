import React, { useEffect, useMemo, useState } from 'react'
import QRCode from 'react-qr-code'
import { supabase } from '../lib/supabaseClient'

export default function QRGenerator() {
  const [role, setRole] = useState('student')
  const [studentId, setStudentId] = useState('')
  const [name, setName] = useState('')
  const [department, setDepartment] = useState('')
  const [savedMembers, setSavedMembers] = useState([])
  const [message, setMessage] = useState('')
  const [errorMessage, setErrorMessage] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  async function loadMembers() {
    setIsLoading(true)
    setErrorMessage('')
    const [studentsResult, facultyResult] = await Promise.all([
      supabase.from('students').select('id, name, department').order('name'),
      supabase.from('faculty').select('id, name, department').order('name')
    ])
    if (studentsResult.error || facultyResult.error) {
      setErrorMessage(studentsResult.error?.message || facultyResult.error.message)
    } else {
      setSavedMembers([
        ...(studentsResult.data || []).map((member) => ({ ...member, role: 'student' })),
        ...(facultyResult.data || []).map((member) => ({ ...member, role: 'faculty' }))
      ].sort((left, right) => (left.name || '').localeCompare(right.name || '')))
    }
    setIsLoading(false)
  }

  useEffect(() => { loadMembers() }, [])

  const readyForQr = Boolean(studentId.trim() && name.trim())
  const payload = useMemo(() => readyForQr ? JSON.stringify({
    role,
    label: role === 'student' ? 'Student' : 'Faculty',
    student_id: studentId.trim(),
    id: studentId.trim(),
    name: name.trim(),
    department: department.trim()
  }) : '', [role, studentId, name, department, readyForQr])

  async function saveMember(event) {
    event.preventDefault()
    setMessage('')
    setErrorMessage('')
    if (!readyForQr) {
      setErrorMessage('Enter a member ID and name before saving.')
      return
    }

    setIsSaving(true)
    const member = { id: studentId.trim(), name: name.trim(), department: department.trim() || null }
    const table = role === 'faculty' ? 'faculty' : 'students'
    const { data, error } = await supabase
      .from(table)
      .upsert(member, { onConflict: 'id' })
      .select('id, name, department')
      .single()
    setIsSaving(false)

    if (error) {
      setErrorMessage(error.message)
      return
    }

    setSavedMembers((current) => [
      { ...data, role },
      ...current.filter((item) => !(item.id === data.id && item.role === role))
    ].sort((left, right) => (left.name || '').localeCompare(right.name || '')))
    setMessage(`${role === 'student' ? 'Student' : 'Faculty member'} saved. The QR preview is ready to scan.`)
  }

  return (
    <div className="qr-generator">
      <form className="qr-form" onSubmit={saveMember}>
        <div className="qr-field">
          <label htmlFor="qr-role">Member type</label>
          <select id="qr-role" value={role} onChange={(event) => setRole(event.target.value)}>
            <option value="student">Student</option>
            <option value="faculty">Faculty</option>
          </select>
        </div>
        <div className="qr-field">
          <label htmlFor="qr-id">ID / Member number</label>
          <input id="qr-id" value={studentId} onChange={(event) => setStudentId(event.target.value)} maxLength={80} required />
        </div>
        <div className="qr-field">
          <label htmlFor="qr-name">Name</label>
          <input id="qr-name" value={name} onChange={(event) => setName(event.target.value)} maxLength={160} required />
        </div>
        <div className="qr-field">
          <label htmlFor="qr-department">Department / Unit</label>
          <input id="qr-department" value={department} onChange={(event) => setDepartment(event.target.value)} maxLength={160} />
        </div>
        <button className="neon-button primary qr-save" type="submit" disabled={isSaving}>
          {isSaving ? 'Saving…' : 'Save member'}
        </button>
      </form>

      {errorMessage && <p className="qr-message error" role="alert">{errorMessage}</p>}
      {message && <p className="qr-message" role="status">{message}</p>}

      <div className="qr-preview-layout">
        <div>
          <h4 className="qr-section-title">QR preview</h4>
          {readyForQr ? (
            <div className="qr-code-box"><QRCode value={payload} size={180} /></div>
          ) : <div className="qr-placeholder">Enter an ID and name to preview a QR.</div>}
        </div>
        <div className="qr-payload">
          <h4 className="qr-section-title">Scannable data</h4>
          <code>{payload || 'Member information will appear here.'}</code>
        </div>
      </div>

      <div className="qr-saved-list">
        <div className="section-heading-row">
          <h4 className="qr-section-title">Saved members ({savedMembers.length})</h4>
          <button className="text-button" type="button" onClick={loadMembers} disabled={isLoading}>
            {isLoading ? 'Loading…' : 'Refresh'}
          </button>
        </div>
        {isLoading ? <p className="qr-empty">Loading saved members…</p> : savedMembers.length === 0 ? (
          <p className="qr-empty">No members saved yet.</p>
        ) : savedMembers.map((member) => (
          <div className="qr-saved-member" key={`${member.role}-${member.id}`}>
            <strong>{member.name}</strong>
            <span>{member.id}</span>
            <small>{member.role === 'faculty' ? 'Faculty' : 'Student'} · {member.department || 'No department'}</small>
          </div>
        ))}
      </div>
    </div>
  )
}
