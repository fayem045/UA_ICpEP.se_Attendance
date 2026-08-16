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
          const payload = JSON.parse(decoded)
          const { student_id, department, name } = payload
          await recordAttendance({ student_id, department, name })
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
    // upsert student
    await supabase.from('students').upsert({ id: student_id, name, department }).select()
    // insert attendance
    const { error } = await supabase.from('attendances').insert({ student_id, department }).select()
    if (error) console.error('insert error', error)
  }

  return (
    <div>
      <div id="qr-reader" style={{ width: 320 }} />
      <p>Point the camera at a student's QR code to record attendance.</p>
    </div>
  )
}
