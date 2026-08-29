import React, { useEffect, useRef } from 'react'
import { Html5Qrcode } from 'html5-qrcode'
import { supabase } from '../lib/supabaseClient'

export default function QRScanner({ onRecorded }) {
  const scannerRef = useRef()

  useEffect(() => {
    const cfg = { fps: 10, qrbox: 250 }
    const html5QrCode = new Html5Qrcode('qr-reader')

    html5QrCode
      .start({ facingMode: 'environment' }, cfg, async (decoded) => {
        try {
          if (decoded.startsWith('{')) {
            const payload = JSON.parse(decoded)
            const { student_id, id, department, name, role } = payload

            if (role && role !== 'student') {
              console.warn('QR is for a non-student role and was not recorded as attendance', { role, label: payload.label })
              return
            }

            const resolvedStudentId = student_id || id
            await recordAttendance({ student_id: resolvedStudentId, department, name })
            if (onRecorded) onRecorded()
            return
          }

          await scanToken(decoded)
          if (onRecorded) onRecorded()
        } catch (err) {
          console.warn('Invalid QR payload', err)
        }
      })
      .catch((err) => console.error('QR start failed', err))

    scannerRef.current = html5QrCode
    return () => {
      if (scannerRef.current) scannerRef.current.stop().catch(() => {})
    }
  }, [])

  async function recordAttendance({ student_id, department, name }) {
    if (!student_id) return

    await supabase.from('students').upsert({ id: student_id, name, department }).select()
    const { error } = await supabase.from('attendances').insert({ student_id, department }).select()
    if (error) console.error('insert error', error)
  }

  async function scanToken(token) {
    const response = await fetch('http://localhost:4000/api/attendance/scan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token })
    })

    const data = await response.json()
    if (!response.ok) {
      console.warn(data.message || 'Attendance recording failed')
      return
    }

    const { studentId, department, name } = data
    if (studentId) {
      await recordAttendance({ student_id: studentId, department, name })
    }
  }

  return (
    <div>
      <div id="qr-reader" style={{ width: 320 }} />
      <p>Point the camera at a student's QR code to record attendance.</p>
    </div>
  )
}
