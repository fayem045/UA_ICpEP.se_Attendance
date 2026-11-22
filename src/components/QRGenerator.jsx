import React, { useEffect, useState } from 'react'
import QRCode from 'react-qr-code'
import { supabase } from '../lib/supabaseClient'

export default function QRGenerator() {
  const [studentId, setStudentId] = useState('')
  const [name, setName] = useState('')
  const [yearLevel, setYearLevel] = useState('')
  const [savedMembers, setSavedMembers] = useState([])
  const [message, setMessage] = useState('')
  const [errorMessage, setErrorMessage] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  async function loadMembers() {
    setIsLoading(true)
    setErrorMessage('')
    const studentsResult = await supabase.from('students').select('id, name, year_level').order('name')
    if (studentsResult.error) {
      setErrorMessage(studentsResult.error.message)
    } else {
      setSavedMembers(studentsResult.data || [])
    }
    setIsLoading(false)
  }

  useEffect(() => { loadMembers() }, [])

  const readyForQr = Boolean(studentId.trim() && name.trim())
  const payload = readyForQr ? studentId.trim() : ''

  async function saveMember(event) {
    event.preventDefault()
    setMessage('')
    setErrorMessage('')
    if (!readyForQr) {
      setErrorMessage('Enter a member ID and name before saving.')
      return
    }

    setIsSaving(true)
    const member = { id: studentId.trim(), name: name.trim(), year_level: yearLevel.trim() || null }
    const { data, error } = await supabase
      .from('students')
      .upsert(member, { onConflict: 'id' })
      .select('id, name, year_level')
      .single()
    setIsSaving(false)

    if (error) {
      setErrorMessage(error.message)
      return
    }

    setSavedMembers((current) => [
      data,
      ...current.filter((item) => item.id !== data.id)
    ].sort((left, right) => (left.name || '').localeCompare(right.name || '')))
    setMessage('Student saved. The QR preview is ready to scan.')
  }

  return (
    <div className="qr-generator">
      <form className="qr-form" onSubmit={saveMember}>
        <div className="qr-field">
          <label htmlFor="qr-id">ID / Member number</label>
          <input id="qr-id" value={studentId} onChange={(event) => setStudentId(event.target.value)} maxLength={80} required />
        </div>
        <div className="qr-field">
          <label htmlFor="qr-name">Name</label>
          <input id="qr-name" value={name} onChange={(event) => setName(event.target.value)} maxLength={160} required />
        </div>
        <div className="qr-field">
          <label htmlFor="qr-year-level">Year Level</label>
          <input id="qr-year-level" value={yearLevel} onChange={(event) => setYearLevel(event.target.value)} maxLength={160} />
        </div>
        <button className="neon-button primary qr-save" type="submit" disabled={isSaving}>
          {isSaving ? 'Saving…' : 'Save student'}
        </button>
      </form>

      {errorMessage && <p className="qr-message error" role="alert">{errorMessage}</p>}
      {message && <p className="qr-message" role="status">{message}</p>}

      <div className="qr-preview-layout">
        <div>
          <h4 className="qr-section-title">QR preview</h4>
          {readyForQr ? (
            <div className="qr-code-box" style={{ background: '#fff', padding: 16 }}>
              <QRCode value={payload} size={220} level="M" />
            </div>
          ) : <div className="qr-placeholder">Enter an ID and name to preview a QR.</div>}
        </div>
        <div className="qr-payload">
          <h4 className="qr-section-title">Scannable data</h4>
          <code>{payload || 'Member information will appear here.'}</code>
        </div>
      </div>

      <div className="qr-saved-list">
        <div className="section-heading-row">
          <h4 className="qr-section-title">Saved students ({savedMembers.length})</h4>
          <button className="text-button" type="button" onClick={loadMembers} disabled={isLoading}>
            {isLoading ? 'Loading…' : 'Refresh'}
          </button>
        </div>
        {isLoading ? <p className="qr-empty">Loading saved students…</p> : savedMembers.length === 0 ? (
          <p className="qr-empty">No students saved yet.</p>
        ) : savedMembers.map((member) => (
          <button
            className="qr-saved-member"
            type="button"
            key={member.id}
            onClick={() => {
              setStudentId(member.id)
              setName(member.name || '')
              setYearLevel(member.year_level || '')
            }}
            aria-label={`Load ${member.name || member.id} into QR preview`}
          >
            <strong>{member.name}</strong>
            <span>{member.id}</span>
            <small>Student · {member.year_level || 'No year level'}</small>
          </button>
        ))}
      </div>
    </div>
  )
}
