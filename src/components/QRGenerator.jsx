import React, { useState } from 'react'
import QRCode from 'react-qr-code'

export default function QRGenerator() {
  const [studentId, setStudentId] = useState('')
  const [name, setName] = useState('')
  const [department, setDepartment] = useState('')

  const payload = JSON.stringify({ student_id: studentId, name, department })

  return (
    <div>
      <label>Student ID</label>
      <input value={studentId} onChange={(e) => setStudentId(e.target.value)} />
      <label>Name</label>
      <input value={name} onChange={(e) => setName(e.target.value)} />
      <label>Department</label>
      <input value={department} onChange={(e) => setDepartment(e.target.value)} />

      <div style={{ marginTop: 12 }}>
        <div style={{ background: 'white', padding: 8, display: 'inline-block' }}>
          <QRCode value={payload || ' '} size={200} />
        </div>
      </div>

      <p>Scanable payload: {payload}</p>
    </div>
  )
}
