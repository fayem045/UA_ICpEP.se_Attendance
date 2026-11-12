import React, { useEffect, useId, useRef, useState } from 'react'
import { Html5Qrcode } from 'html5-qrcode'
import { supabase } from '../lib/supabaseClient'
import { API_BASE_URL } from '../lib/api'

function normalizeError(error) {
  if (error?.code === '23505') return 'This student is already recorded for this event.'
  return error?.message || 'Attendance could not be recorded.'
}

export default function QRScanner({ eventId = null, eventName = 'General Assembly', onRecorded }) {
  const generatedId = useId().replace(/:/g, '')
  const readerId = `qr-reader-${generatedId}`
  const scannerRef = useRef(null)
  const callbackRef = useRef(onRecorded)
  const scanLockRef = useRef(false)
  const seenCodesRef = useRef(new Set())
  const [scannerState, setScannerState] = useState('starting')
  const [message, setMessage] = useState('Starting camera…')
  const [isError, setIsError] = useState(false)

  useEffect(() => { callbackRef.current = onRecorded }, [onRecorded])

  useEffect(() => {
    let active = true
    let isScanning = false
    seenCodesRef.current = new Set()
    const scanner = new Html5Qrcode(readerId)
    scannerRef.current = scanner

    const startPromise = scanner.start(
      { facingMode: 'environment' },
      { fps: 10, qrbox: { width: 250, height: 250 }, aspectRatio: 1 },
      async (decodedText) => {
        if (scanLockRef.current || seenCodesRef.current.has(decodedText)) return
        scanLockRef.current = true
        seenCodesRef.current.add(decodedText)
        setIsError(false)
        setMessage('Checking QR code…')
        try {
          const result = decodedText.trim().startsWith('{')
            ? await scanMemberQr(decodedText)
            : await scanToken(decodedText)
          setMessage(result.message)
          if (result.ok) await callbackRef.current?.(result)
        } catch (error) {
          seenCodesRef.current.delete(decodedText)
          setIsError(true)
          setMessage(normalizeError(error))
        } finally {
          window.setTimeout(() => { scanLockRef.current = false }, 1200)
        }
      },
      () => {}
    )

    startPromise.then(() => {
      isScanning = true
      if (active) {
        setScannerState('scanning')
        setMessage('Camera ready. Scan a student QR code.')
      } else {
        scanner.stop().catch(() => {})
      }
    }).catch((error) => {
      if (!active) return
      setScannerState('error')
      setIsError(true)
      setMessage(error?.message || 'Camera could not start. Check browser camera permission and try again.')
    })

    return () => {
      active = false
      if (isScanning) scanner.stop().catch(() => {})
      else startPromise.then(() => scanner.stop().catch(() => {})).catch(() => {})
      if (scannerRef.current === scanner) scannerRef.current = null
    }
  }, [readerId, eventId, eventName])

  async function scanMemberQr(rawPayload) {
    let payload
    try { payload = JSON.parse(rawPayload) } catch { throw new Error('This QR code is not valid JSON.') }
    if (payload.role && payload.role !== 'student') throw new Error('This QR code belongs to a faculty member, not a student.')
    const studentId = payload.student_id || payload.id
    if (!studentId) throw new Error('The QR code does not contain a student ID.')
    return recordAttendance({
      studentId,
      name: payload.name || '',
      department: payload.department || ''
    })
  }

  async function scanToken(token) {
    const response = await fetch(`${API_BASE_URL}/api/attendance/scan`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token })
    })
    const data = await response.json().catch(() => ({}))
    if (!response.ok) throw new Error(data.message || 'QR token is invalid or has expired.')
    return recordAttendance({ studentId: data.studentId, name: data.name || '', department: data.department || '' })
  }

  async function recordAttendance({ studentId, name, department }) {
    if (!studentId) throw new Error('No student ID was found in this QR code.')

    const { error: studentError } = await supabase.from('students').upsert({
      id: String(studentId),
      name: name || String(studentId),
      department: department || null
    }, { onConflict: 'id' })
    if (studentError) throw studentError

    const { data, error } = await supabase.from('attendances').insert({
      student_id: String(studentId),
      department: department || null,
      event_id: eventId || null,
      event_name: eventName,
      status: 'Present'
    }).select('id, student_id, event_id, event_name, scanned_at, status').single()
    if (error) throw error
    return { ok: true, record: data, message: `Attendance recorded for ${name || studentId}.` }
  }

  return (
    <div className="scanner-panel">
      <div className="scanner-reader" id={readerId} />
      <p className={`attendance-message${isError ? ' attendance-error' : ''}`} role={isError ? 'alert' : 'status'}>
        {scannerState === 'starting' ? 'Starting camera…' : message}
      </p>
      <small className="muted-text">Scanning for: {eventName}</small>
    </div>
  )
}
