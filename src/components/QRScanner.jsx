import React, { useEffect, useId, useRef, useState } from 'react'
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode'
import { supabase } from '../lib/supabaseClient'
import { API_BASE_URL } from '../lib/api'
import { getStatusForScan } from '../lib/attendanceStatus'

function normalizeError(error) {
  if (error?.code === '23505') return 'This student is already recorded for this event.'
  if (/failed to fetch|networkerror/i.test(error?.message || '')) {
    return 'Cannot reach the server. Check your internet connection and the Supabase URL in .env.'
  }
  return error?.message || 'Attendance could not be recorded.'
}

function extractStudentId(decodedText) {
  const value = decodedText.trim()
  if (!value.startsWith('{')) return value

  let payload
  try {
    payload = JSON.parse(value)
  } catch {
    throw new Error('Unreadable QR code.')
  }
  if (payload.role && payload.role !== 'student') throw new Error('This QR code does not belong to a student.')
  return String(payload.student_id || payload.id || '').trim()
}

async function shutdownScanner(scanner) {
  if (!scanner) return
  try { await scanner.stop() } catch { /* already stopped */ }
  try { await scanner.clear() } catch { /* already cleared */ }
}

export default function QRScanner({ eventId = null, eventName = 'General Assembly', eventStartsAt = null, students = [], onRecorded }) {
  const generatedId = useId().replace(/[^a-zA-Z0-9_-]/g, '')
  const readerId = `qr-reader-${generatedId}`
  const callbackRef = useRef(onRecorded)
  const rosterRef = useRef(new Map())
  const startsAtRef = useRef(eventStartsAt)
  const scanLockRef = useRef(false)
  const recentScansRef = useRef(new Map())
  const [scannerState, setScannerState] = useState('idle')
  const [cameraOn, setCameraOn] = useState(false)
  const [message, setMessage] = useState('Camera is stopped.')
  const [isError, setIsError] = useState(false)
  const [scanAttempt, setScanAttempt] = useState(0)
  const [manualId, setManualId] = useState('')
  const [isManualSubmitting, setIsManualSubmitting] = useState(false)
  const pendingStopRef = useRef(Promise.resolve())

  useEffect(() => { callbackRef.current = onRecorded }, [onRecorded])
  useEffect(() => { startsAtRef.current = eventStartsAt }, [eventStartsAt])
  useEffect(() => {
    rosterRef.current = new Map(students.map((student) => [String(student.id), student]))
  }, [students])

  useEffect(() => {
    if (!cameraOn) return undefined

    let active = true
    let scanner = null
    recentScansRef.current = new Map()

    setScannerState('starting')
    setIsError(false)
    setMessage('Starting camera…')

    if (!window.isSecureContext && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
      setScannerState('error')
      setIsError(true)
      setMessage('Camera access requires HTTPS or localhost.')
      return undefined
    }
    if (!navigator.mediaDevices?.getUserMedia) {
      setScannerState('error')
      setIsError(true)
      setMessage('This browser does not support camera scanning.')
      return undefined
    }

    const scanConfig = {
      fps: 20,
      disableFlip: true,
      qrbox(viewfinderWidth, viewfinderHeight) {
        const size = Math.max(150, Math.floor(Math.min(viewfinderWidth, viewfinderHeight) * 0.8))
        return {
          width: Math.max(1, Math.min(size, viewfinderWidth)),
          height: Math.max(1, Math.min(size, viewfinderHeight))
        }
      }
    }

    const onDecode = async (decodedText) => {
      if (!active) return
      const now = Date.now()
      const lastScanAt = recentScansRef.current.get(decodedText)
      if (scanLockRef.current || (lastScanAt && now - lastScanAt < 5000)) return
      scanLockRef.current = true
      recentScansRef.current.set(decodedText, now)
      setIsError(false)
      setMessage('Checking student QR code…')
      try {
        const value = decodedText.trim()
        const result = value.startsWith('eyJ') && value.split('.').length === 3
          ? await scanToken(value)
          : await recordAttendance(extractStudentId(value))
        setMessage(result.message)
        if (result.ok) {
          navigator.vibrate?.(80)
          await callbackRef.current?.(result)
        }
      } catch (error) {
        recentScansRef.current.delete(decodedText)
        setIsError(true)
        setMessage(normalizeError(error))
      } finally {
        window.setTimeout(() => { scanLockRef.current = false }, 1200)
      }
    }

    const isPermissionError = (error) => error?.name === 'NotAllowedError' || error?.name === 'PermissionDeniedError'

    const run = async () => {
      await pendingStopRef.current
      if (!active) return

      scanner = new Html5Qrcode(readerId, {
        formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
        experimentalFeatures: { useBarCodeDetectorIfSupported: true },
        verbose: false
      })
      const videoConstraints = {
        facingMode: 'environment',
        width: { ideal: 1920 },
        height: { ideal: 1080 }
      }
      try {
        await scanner.start({ facingMode: 'environment' }, {
          ...scanConfig,
          videoConstraints: { ...videoConstraints, advanced: [{ focusMode: 'continuous' }] }
        }, onDecode, () => {})
      } catch (error) {
        if (isPermissionError(error)) throw error
        try {
          await scanner.start({ facingMode: 'environment' }, { ...scanConfig, videoConstraints }, onDecode, () => {})
        } catch (error) {
          if (isPermissionError(error)) throw error
          await scanner.start({ facingMode: 'user' }, scanConfig, onDecode, () => {})
        }
      }
    }
    const startPromise = run()

    startPromise.then(() => {
      if (!active) return
      setScannerState('scanning')
      setMessage('Camera ready. Scan a student QR code.')
    }).catch((error) => {
      if (!active) return
      setScannerState('error')
      setIsError(true)
      setMessage(error?.message || 'Camera could not start. Check browser camera permission and try again.')
    })

    return () => {
      active = false
      pendingStopRef.current = startPromise
        .catch(() => {})
        .then(() => shutdownScanner(scanner))
    }
  }, [cameraOn, scanAttempt, readerId, eventId, eventName])

  async function submitManual(event) {
    event.preventDefault()
    const id = manualId.trim()
    if (!id) return
    if (scanLockRef.current) {
      setIsError(true)
      setMessage('A scan is being processed. Try again in a moment.')
      return
    }

    scanLockRef.current = true
    setIsManualSubmitting(true)
    setIsError(false)
    setMessage('Recording attendance…')
    try {
      const result = await recordAttendance(id)
      setMessage(result.message)
      navigator.vibrate?.(80)
      await callbackRef.current?.(result)
      setManualId('')
    } catch (error) {
      setIsError(true)
      setMessage(normalizeError(error))
    } finally {
      scanLockRef.current = false
      setIsManualSubmitting(false)
    }
  }

  async function scanToken(token) {
    const response = await fetch(`${API_BASE_URL}/api/attendance/scan`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token })
    })
    const data = await response.json().catch(() => ({}))
    if (!response.ok) throw new Error(data.message || 'QR token is invalid or has expired.')
    return recordAttendance(data.studentId, {
      name: data.name || '',
      yearLevel: data.yearLevel || data.department || '',
      syncStudent: true
    })
  }

  async function recordAttendance(studentId, { name = '', yearLevel = '', syncStudent = false } = {}) {
    const normalizedStudentId = String(studentId || '').trim()
    if (!normalizedStudentId || normalizedStudentId.length > 80) throw new Error('This is not a valid student QR code.')

    let student = rosterRef.current.get(normalizedStudentId)
    if (syncStudent) {
      const { data, error } = await supabase.from('students').upsert({
        id: normalizedStudentId,
        name: name || normalizedStudentId,
        year_level: yearLevel || null
      }, { onConflict: 'id' }).select('id, name, year_level').single()
      if (error) throw error
      student = data
    } else if (!student) {
      const { data, error } = await supabase.from('students')
        .select('id, name, year_level')
        .eq('id', normalizedStudentId)
        .maybeSingle()
      if (error) throw error
      student = data
    }
    if (!student) throw new Error(`Student "${normalizedStudentId}" is not registered. Add them from the Dashboard first.`)

    const displayName = student.name || student.id
    if (!eventId) {
      const { data: existing, error } = await supabase.from('attendances')
        .select('id')
        .eq('student_id', normalizedStudentId)
        .is('event_id', null)
        .eq('event_name', eventName)
        .limit(1)
        .maybeSingle()
      if (error) throw error
      if (existing) return { ok: true, message: `${displayName} is already recorded for this event.` }
    }

    const status = getStatusForScan(startsAtRef.current, new Date())
    const { data, error } = await supabase.from('attendances').insert({
      student_id: normalizedStudentId,
      year_level: student.year_level || yearLevel || null,
      event_id: eventId || null,
      event_name: eventName,
      status
    }).select('id, student_id, event_id, event_name, year_level, scanned_at, status').single()
    if (error?.code === '23505') return { ok: true, message: `${displayName} is already recorded for this event.` }
    if (error) throw error
    return { ok: true, record: data, message: `${displayName}: ${status}` }
  }

  return (
    <div className="scanner-panel">
      <div className="scanner-reader" id={readerId} />
      <p className={`attendance-message${isError ? ' attendance-error' : ''}`} role={isError ? 'alert' : 'status'}>
        {scannerState === 'starting' ? 'Starting camera…' : message}
      </p>
      <div className="scanner-actions">
        {scannerState === 'scanning' ? (
          <button className="neon-button" type="button" onClick={(event) => {
            event.preventDefault()
            event.stopPropagation()
            setCameraOn(false)
            setScannerState('idle')
            setIsError(false)
            setMessage('Camera stopped.')
          }}>Stop camera</button>
        ) : (
          <button
            className="neon-button primary"
            type="button"
            onClick={(event) => {
              event.preventDefault()
              event.stopPropagation()
              setCameraOn(true)
              setScanAttempt((attempt) => attempt + 1)
            }}
            disabled={scannerState === 'starting'}
          >
            {scannerState === 'error' ? 'Retry camera' : 'Start camera'}
          </button>
        )}
      </div>
      <form className="scanner-manual-form" onSubmit={submitManual}>
        <input
          id={`${readerId}-manual-id`}
          aria-label="Student ID"
          value={manualId}
          onChange={(event) => setManualId(event.target.value)}
          placeholder="Type student ID"
          maxLength={80}
          autoComplete="off"
          required
        />
        <button className="neon-button" type="submit" disabled={isManualSubmitting || !manualId.trim()}>
          {isManualSubmitting ? 'Recording…' : 'Record'}
        </button>
      </form>
      <small className="muted-text">Scanning student QR codes for: {eventName}</small>
    </div>
  )
}
