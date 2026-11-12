import React, { useCallback, useEffect, useMemo, useState } from 'react'
import NavBar from '../components/NavBar'
import QRScanner from '../components/QRScanner'
import { supabase } from '../lib/supabaseClient'

const STATUSES = ['Present', 'Late', 'Absent']

function formatDate(value) {
  return value ? new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value)) : '—'
}

export default function Attendance({ profile, onNavigate }) {
  const [events, setEvents] = useState([])
  const [eventId, setEventId] = useState('')
  const [students, setStudents] = useState([])
  const [attendanceRecords, setAttendanceRecords] = useState([])
  const [statusFilter, setStatusFilter] = useState('')
  const [search, setSearch] = useState('')
  const [selectedStatuses, setSelectedStatuses] = useState({})
  const [isLoading, setIsLoading] = useState(true)
  const [isSavingId, setIsSavingId] = useState('')
  const [isDeletingId, setIsDeletingId] = useState('')
  const [eventsError, setEventsError] = useState('')
  const [errorMessage, setErrorMessage] = useState('')
  const [message, setMessage] = useState('')

  const selectedEvent = events.find((event) => event.id === eventId)
  const eventName = selectedEvent?.name || 'General Assembly'

  useEffect(() => {
    let active = true
    async function loadEvents() {
      const { data, error } = await supabase
        .from('events')
        .select('id, name, starts_at')
        .order('starts_at', { ascending: true })
      if (!active) return
      if (error) setEventsError(error.message)
      else {
        const list = data || []
        setEvents(list)
        if (list.length) {
          setEventId((current) => current || (list.find((item) => new Date(item.starts_at) >= new Date()) || list[0]).id)
        }
      }
    }
    loadEvents()
    return () => { active = false }
  }, [])

  const loadAttendance = useCallback(async () => {
    setIsLoading(true)
    setErrorMessage('')
    const attendanceQuery = supabase
      .from('attendances')
      .select('id, student_id, event_id, event_name, department, scanned_at, status')
      .order('scanned_at', { ascending: false })
    if (eventId) attendanceQuery.eq('event_id', eventId)
    else attendanceQuery.is('event_id', null).eq('event_name', eventName)

    const [studentsResult, attendanceResult] = await Promise.all([
      supabase.from('students').select('id, name, department').order('name'),
      attendanceQuery
    ])
    if (studentsResult.error || attendanceResult.error) {
      setErrorMessage(studentsResult.error?.message || attendanceResult.error.message)
    } else {
      setStudents(studentsResult.data || [])
      setAttendanceRecords(attendanceResult.data || [])
    }
    setIsLoading(false)
  }, [eventId, eventName])

  useEffect(() => { loadAttendance() }, [loadAttendance])

  const attendanceByStudent = useMemo(() => {
    const map = new Map()
    for (const record of attendanceRecords) {
      if (record.student_id && !map.has(record.student_id)) map.set(record.student_id, record)
    }
    return map
  }, [attendanceRecords])

  const visibleStudents = useMemo(() => students.filter((student) => {
    const record = attendanceByStudent.get(student.id)
    const status = record?.status || 'Absent'
    const matchesStatus = !statusFilter || status === statusFilter
    const query = search.trim().toLowerCase()
    const matchesSearch = !query || [student.id, student.name, student.department]
      .some((value) => String(value || '').toLowerCase().includes(query))
    return matchesStatus && matchesSearch
  }), [students, attendanceByStudent, statusFilter, search])

  async function saveStatus(student) {
    const attendance = attendanceByStudent.get(student.id)
    const status = selectedStatuses[student.id] || attendance?.status || 'Absent'
    setIsSavingId(student.id)
    setErrorMessage('')
    setMessage('')

    const result = attendance
      ? await supabase.from('attendances').update({ status }).eq('id', attendance.id)
        .select('id, student_id, event_id, event_name, department, scanned_at, status').single()
      : await supabase.from('attendances').insert({
        student_id: student.id,
        event_id: eventId || null,
        event_name: eventName,
        department: student.department || null,
        status
      }).select('id, student_id, event_id, event_name, department, scanned_at, status').single()

    setIsSavingId('')
    if (result.error) {
      setErrorMessage(result.error.code === '23505' ? 'This student already has an attendance record for the selected event.' : result.error.message)
      return
    }
    setAttendanceRecords((current) => [result.data, ...current.filter((record) => record.id !== result.data.id)])
    setSelectedStatuses((current) => ({ ...current, [student.id]: result.data.status }))
    setMessage(`Attendance saved for ${student.name || student.id}.`)
  }

  async function deleteAttendance(student) {
    const attendance = attendanceByStudent.get(student.id)
    if (!attendance || !window.confirm(`Delete this attendance record for ${student.name || student.id}?`)) return
    setIsDeletingId(student.id)
    setErrorMessage('')
    setMessage('')
    const { error } = await supabase.from('attendances').delete().eq('id', attendance.id)
    setIsDeletingId('')
    if (error) setErrorMessage(error.message)
    else {
      setAttendanceRecords((current) => current.filter((record) => record.id !== attendance.id))
      setSelectedStatuses((current) => ({ ...current, [student.id]: 'Absent' }))
      setMessage(`Attendance record removed for ${student.name || student.id}.`)
    }
  }

  async function handleScanned(result) {
    setMessage(result.message)
    await loadAttendance()
  }

  const statusCounts = useMemo(() => attendanceRecords.reduce((counts, record) => {
    counts[record.status] = (counts[record.status] || 0) + 1
    return counts
  }, {}), [attendanceRecords])

  return (
    <div className="app-shell container">
      <NavBar activePage="attendance" onNavigate={onNavigate} profile={profile} />
      <div className="dashboard-header">
        <div className="header-left">
          <h1>Attendance</h1>
          <p>Scan student QR codes or update attendance records for an event.</p>
        </div>
        <button className="neon-button" type="button" onClick={loadAttendance} disabled={isLoading}>{isLoading ? 'Refreshing…' : 'Refresh'}</button>
      </div>

      <section className="card page-card attendance-card">
        <div className="attendance-toolbar">
          <label className="attendance-event-select">
            <span>Event</span>
            <select value={eventId} onChange={(event) => setEventId(event.target.value)}>
              <option value="">General Assembly (legacy)</option>
              {events.map((event) => <option key={event.id} value={event.id}>{event.name}</option>)}
            </select>
          </label>
          <div className="attendance-status-filters" aria-label="Filter students by status">
            <button className={`neon-button${statusFilter === '' ? ' primary' : ''}`} type="button" aria-pressed={statusFilter === ''} onClick={() => setStatusFilter('')}>All</button>
            {STATUSES.map((status) => (
              <button className={`neon-button${statusFilter === status ? ' primary' : ''}`} key={status} type="button" aria-pressed={statusFilter === status} onClick={() => setStatusFilter((current) => current === status ? '' : status)}>{status}</button>
            ))}
          </div>
        </div>

        {eventsError && <p className="status-message error" role="alert">Could not load event choices: {eventsError}</p>}
        {errorMessage && <p className="status-message error" role="alert">{errorMessage}</p>}
        {message && <p className="status-message" role="status">{message}</p>}

        <div className="attendance-summary">
          <span>{students.length} students</span>
          <span>{attendanceRecords.length} records</span>
          {STATUSES.map((status) => <span key={status}>{status}: {statusCounts[status] || 0}</span>)}
        </div>

        <div className="scanner-card">
          <div>
            <h2 className="section-heading">Scan attendance</h2>
            <p className="muted-text">Allow camera access to scan a student QR code.</p>
          </div>
          <QRScanner eventId={eventId || null} eventName={eventName} onRecorded={handleScanned} />
        </div>

        <div className="filter-toolbar attendance-list-toolbar">
          <div>
            <h2 className="section-heading">Student roster</h2>
            <p className="muted-text">Mark absent students manually, or update a scanned record.</p>
          </div>
          <label className="form-field search-field">
            <span>Search</span>
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Name or student ID" />
          </label>
        </div>

        {isLoading ? <p className="muted-text">Loading attendance…</p> : students.length === 0 ? (
          <div className="empty-state">No students are in the roster yet. Add students from the Dashboard QR generator.</div>
        ) : visibleStudents.length === 0 ? (
          <div className="empty-state">No students match these filters.</div>
        ) : (
          <div className="table-scroll">
            <table className="table attendance-table data-table">
              <thead><tr><th>Student</th><th>ID</th><th>Department</th><th>Status</th><th>Last updated</th><th>Actions</th></tr></thead>
              <tbody>
                {visibleStudents.map((student) => {
                  const record = attendanceByStudent.get(student.id)
                  const status = selectedStatuses[student.id] || record?.status || 'Absent'
                  const saving = isSavingId === student.id
                  const deleting = isDeletingId === student.id
                  return (
                    <tr key={student.id}>
                      <td>{student.name || '—'}</td>
                      <td>{student.id}</td>
                      <td>{student.department || '—'}</td>
                      <td><select aria-label={`Attendance status for ${student.name || student.id}`} value={status} onChange={(event) => setSelectedStatuses((current) => ({ ...current, [student.id]: event.target.value }))}>{STATUSES.map((value) => <option key={value}>{value}</option>)}</select></td>
                      <td>{formatDate(record?.scanned_at)}</td>
                      <td className="attendance-row-actions">
                        <button className="neon-button primary" type="button" disabled={saving || deleting} onClick={() => saveStatus(student)}>{saving ? 'Saving…' : record ? 'Update' : 'Save'}</button>
                        {record && <button className="neon-button" type="button" disabled={saving || deleting} onClick={() => deleteAttendance(student)}>{deleting ? 'Deleting…' : 'Delete'}</button>}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}
