import React from 'react'
import QRCode from 'react-qr-code'
import { supabase } from '../lib/supabaseClient'

export default function StudentView({ profile }) {
  const payload = JSON.stringify({ student_id: profile.student_id || profile.id, name: profile.full_name || profile.email, department: profile.department || '' })

  async function signOut() {
    await supabase.auth.signOut()
    window.location.reload()
  }

  return (
    <div className="container">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1>Student Portal</h1>
        <div>
          <strong>{profile.email}</strong>
          <button onClick={signOut} style={{ marginLeft: 12 }}>Sign out</button>
        </div>
      </div>

      <div className="card" style={{ maxWidth: 400 }}>
        <h2>Your QR</h2>
        <div style={{ background: 'white', padding: 8, display: 'inline-block' }}>
          <QRCode value={payload} size={200} />
        </div>
        <p>Show this QR to the scanner to register attendance.</p>
      </div>
    </div>
  )
}
