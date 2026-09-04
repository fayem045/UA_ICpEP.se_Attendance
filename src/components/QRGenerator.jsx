import React, { useEffect, useState } from 'react'
import QRCode from 'react-qr-code'
import { supabase } from '../lib/supabaseClient'

export default function QRGenerator() {
  const [role, setRole] = useState('student')
  const [label, setLabel] = useState('Student')
  const [studentId, setStudentId] = useState('')
  const [name, setName] = useState('')
  const [department, setDepartment] = useState('')
  const [savedMembers, setSavedMembers] = useState([])
  const [message, setMessage] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    async function loadMembers() {
      const { data, error } = await supabase
        .from('students')
        .select('id, name, department')

      if (!error) setSavedMembers(data || [])
    }

    loadMembers()
  }, [])

  const payload = JSON.stringify({
    role,
    label: label || role,
    student_id: studentId,
    id: studentId,
    name,
    department
  })

  async function saveMember(event) {
    event.preventDefault()
    setMessage('')

    if (!studentId.trim() || !name.trim()) {
      setMessage('ID / Member Number and Name are required.')
      return
    }

    setIsSaving(true)
    const member = {
      id: studentId.trim(),
      name: name.trim(),
      department: department.trim()
    }
    const { data, error } = await supabase
      .from('students')
      .upsert(member)
      .select('id, name, department')
      .single()

    setIsSaving(false)
    if (error) {
      setMessage(error.message)
      return
    }

    setSavedMembers((current) => [data, ...current.filter((item) => item.id !== data.id)])
    setMessage('Member saved successfully.')
  }

  return (
    <div className="qr-generator">
      <form className="qr-form" onSubmit={saveMember}>
        <div className="qr-field">
          <label htmlFor="qr-role">Role</label>
          <select id="qr-role" value={role} onChange={(e) => {
            const nextRole = e.target.value
            setRole(nextRole)
            setLabel(nextRole === 'student' ? 'Student' : nextRole === 'faculty' ? 'Faculty' : nextRole === 'staff' ? 'Staff' : nextRole === 'guest' ? 'Guest' : 'Volunteer')
          }}>
            <option value="student">Student</option>
            <option value="faculty">Faculty</option>
            <option value="staff">Staff</option>
            <option value="guest">Guest</option>
            <option value="volunteer">Volunteer</option>
          </select>
        </div>

        <div className="qr-field">
          <label htmlFor="qr-label">Label</label>
          <input id="qr-label" value={label} onChange={(e) => setLabel(e.target.value)} />
        </div>

        <div className="qr-field">
          <label htmlFor="qr-id">ID / Member Number</label>
          <input id="qr-id" value={studentId} onChange={(e) => setStudentId(e.target.value)} required />
        </div>

        <div className="qr-field">
          <label htmlFor="qr-name">Name</label>
          <input id="qr-name" value={name} onChange={(e) => setName(e.target.value)} required />
        </div>

        <div className="qr-field qr-field-wide">
          <label htmlFor="qr-department">Department / Unit</label>
          <input id="qr-department" value={department} onChange={(e) => setDepartment(e.target.value)} />
        </div>

        <button className="neon-button primary qr-save" type="submit" disabled={isSaving}>
          {isSaving ? 'Saving...' : 'Save Member'}
        </button>
      </form>

      {message && <p className="qr-message" role="status">{message}</p>}

      <div className="qr-preview-layout">
        <div>
          <h4 className="qr-section-title">QR Preview</h4>
          <div className="qr-code-box">
            <QRCode value={payload || ' '} size={180} />
          </div>
        </div>
        <div className="qr-payload">
          <h4 className="qr-section-title">Scannable Data</h4>
          <code>{payload}</code>
        </div>
      </div>

      <div className="qr-saved-list">
        <h4 className="qr-section-title">Saved Members ({savedMembers.length})</h4>
        {savedMembers.length === 0 ? <p className="qr-empty">No members saved yet.</p> : savedMembers.map((member) => (
          <div className="qr-saved-member" key={member.id}>
            <strong>{member.name}</strong>
            <span>{member.id}</span>
            <small>{member.department || 'No department'}</small>
          </div>
        ))}
      </div>
    </div>
  )
}
