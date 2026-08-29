import React, { useState } from 'react'
import QRCode from 'react-qr-code'

export default function QRGenerator() {
  const [role, setRole] = useState('student')
  const [label, setLabel] = useState('Student')
  const [studentId, setStudentId] = useState('')
  const [name, setName] = useState('')
  const [department, setDepartment] = useState('')

  const payload = JSON.stringify({
    role,
    label: label || role,
    student_id: studentId,
    id: studentId,
    name,
    department
  })

  return (
    <div>
      <label>Role</label>
      <select value={role} onChange={(e) => {
        const nextRole = e.target.value
        setRole(nextRole)
        setLabel(nextRole === 'student' ? 'Student' : nextRole === 'faculty' ? 'Faculty' : nextRole === 'staff' ? 'Staff' : nextRole === 'guest' ? 'Guest' : 'Volunteer')
      }} style={{ width: '100%', marginBottom: 8 }}>
        <option value="student">Student</option>
        <option value="faculty">Faculty</option>
        <option value="staff">Staff</option>
        <option value="guest">Guest</option>
        <option value="volunteer">Volunteer</option>
      </select>

      <label>Label</label>
      <input value={label} onChange={(e) => setLabel(e.target.value)} />

      <label>ID / Member Number</label>
      <input value={studentId} onChange={(e) => setStudentId(e.target.value)} />

      <label>Name</label>
      <input value={name} onChange={(e) => setName(e.target.value)} />

      <label>Department / Unit</label>
      <input value={department} onChange={(e) => setDepartment(e.target.value)} />

      <div style={{ marginTop: 12 }}>
        <div style={{ background: 'white', padding: 8, display: 'inline-block' }}>
          <QRCode value={payload || ' '} size={180} />
        </div>
      </div>

      <p style={{ fontSize: 12, wordBreak: 'break-word' }}>Scanable payload: {payload}</p>
    </div>
  )
}
