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
    const scanConfig = {
      fps: 10,
      qrbox(viewfinderWidth, viewfinderHeight) {
        const size = Math.floor(Math.min(viewfinderWidth, viewfinderHeight) * 0.75)
        return { width: size, height: size }
      },
      aspectRatio: 1
    }

    const onDecode = async (decodedText) => {
      if (scanLockRef.current || seenCodesRef.current.has(decodedText)) return
      scanLockRef.current = true
      seenCodesRef.current.add(decodedText)
      setIsError(false)
      setMessage('Checking student QR code…')
      try {
        const value = decodedText.trim()
        const result = value.startsWith('{')
          ? await scanMemberQr(value)
          : await scanToken(value)
        setMessage(result.message)
        if (result.ok) await callbackRef.current?.(result)
      } catch (error) {
        seenCodesRef.current.delete(decodedText)
        setIsError(true)
        setMessage(normalizeError(error))
      } finally {
        window.setTimeout(() => { scanLockRef.current = false }, 1200)
      }
    }

    const startScanner = async () => {
      try {
        await scanner.start({ facingMode: 'environment' }, scanConfig, onDecode, () => {})
      } catch (error) {
        if (error?.name === 'NotAllowedError' || error?.name === 'PermissionDeniedError') throw error
        await scanner.start({ facingMode: 'user' }, scanConfig, onDecode, () => {})
      }
    }
    const startPromise = startScanner()

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
    if (payload.role && payload.role !== 'student') throw new Error('This QR code does not belong to a student.')
    const studentId = payload.student_id || payload.id
    if (!studentId) throw new Error('The QR code does not contain a student ID.')
    return recordAttendance({
      studentId,
      name: payload.name || '',
      yearLevel: payload.year_level || payload.department || ''
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
    return recordAttendance({ studentId: data.studentId, name: data.name || '', yearLevel: data.yearLevel || data.department || '' })
  }

  async function recordAttendance({ studentId, name, yearLevel }) {
    if (!studentId) throw new Error('No student ID was found in this QR code.')
    const normalizedStudentId = String(studentId).trim()
    if (!normalizedStudentId) throw new Error('No student ID was found in this QR code.')

    const { error: studentError } = await supabase.from('students').upsert({
      id: normalizedStudentId,
      name: name || normalizedStudentId,
      year_level: yearLevel || null
    }, { onConflict: 'id' })
    if (studentError) throw studentError

    const attendanceSelection = 'id, student_id, event_id, event_name, scanned_at, status'
    let existingAttendanceQuery = supabase.from('attendances')
      .select(attendanceSelection)
      .eq('student_id', normalizedStudentId)
      .limit(1)
    if (eventId) existingAttendanceQuery = existingAttendanceQuery.eq('event_id', eventId)
    else existingAttendanceQuery = existingAttendanceQuery.is('event_id', null).eq('event_name', eventName)
    const { data: existingAttendance, error: existingAttendanceError } = await existingAttendanceQuery.maybeSingle()
    if (existingAttendanceError) throw existingAttendanceError
    if (existingAttendance) {
      return {
        ok: true,
        record: existingAttendance,
        message: `Student profile synced; ${name || normalizedStudentId} is already recorded for this event.`
      }
    }

    const { data, error } = await supabase.from('attendances').insert({
      student_id: normalizedStudentId,
      year_level: yearLevel || null,
      event_id: eventId || null,
      event_name: eventName,
      status: 'Present'
    }).select(attendanceSelection).single()
    if (error) throw error
    return { ok: true, record: data, message: `Student profile synced and attendance recorded for ${name || normalizedStudentId}.` }
  }

  return (
    <div className="scanner-panel">
      <div className="scanner-reader" id={readerId} />
      <p className={`attendance-message${isError ? ' attendance-error' : ''}`} role={isError ? 'alert' : 'status'}>
        {scannerState === 'starting' ? 'Starting camera…' : message}
      </p>
      <small className="muted-text">Scanning student QR codes for: {eventName}</small>
    </div>
  )
}
