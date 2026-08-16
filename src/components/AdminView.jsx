import React, { useEffect, useState } from 'react'
import QRGenerator from './QRGenerator'
import QRScanner from './QRScanner'
import { supabase, API_DEFAULT_LIMIT } from '../lib/supabaseClient'

export default function AdminView({ profile }) {
  const [attendances, setAttendances] = useState([])

  useEffect(() => { fetchLatest() }, [])

  async function fetchLatest() {
    const { data, error } = await supabase
      .from('attendances')
      .select('*')
      .order('scanned_at', { ascending: false })
      .limit(API_DEFAULT_LIMIT)
    if (error) console.error(error)
    else setAttendances(data || [])
  }

  async function signOut() {
    await supabase.auth.signOut()
    window.location.reload()
  }

  return (
    <div className="container">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1>Admin Dashboard</h1>
        <div>
          <strong>{profile.email}</strong>
          <button onClick={signOut} style={{ marginLeft: 12 }}>Sign out</button>
        </div>
      </div>

      <div className="columns">
        <div className="card">
          <h2>Generate QR</h2>
          <QRGenerator />
        </div>
        <div className="card">
          <h2>Scan QR</h2>
          <QRScanner onRecorded={fetchLatest} />
        </div>
      </div>

      <div className="card">
        <h2>Recent Attendance</h2>
        <ul>
          {attendances.map((a) => (
            <li key={a.id}>{a.student_id} — {a.department} — {new Date(a.scanned_at).toLocaleString()}</li>
          ))}
        </ul>
      </div>
    </div>
  )
}
