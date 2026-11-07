import React, { useEffect, useMemo, useState } from 'react'
import NavBar from '../components/NavBar'
import { supabase } from '../lib/supabaseClient'

const EVENT_OPTIONS = ['General Assembly']
const ATTENDANCE_STATUSES = ['Present', 'Late', 'Absent']

export default function Attendance({ profile, onNavigate }) {
  const [eventName, setEventName] = useState(EVENT_OPTIONS[0])
  const [statusFilter, setStatusFilter] = useState('')
  const [students, setStudents] = useState([])
  const [attendanceRecords, setAttendanceRecords] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [savingStudentId, setSavingStudentId] = useState('')
  const [deletingStudentId, setDeletingStudentId] = useState('')
  const [errorMessage, setErrorMessage] = useState('')
  const [message, setMessage] = useState('')
  const [selectedStatuses, setSelectedStatuses] = useState({})

  useEffect(() => {
    let active = true

    async function loadAttendance() {
      setIsLoading(true)
      setErrorMessage('')

      const [studentsResult, attendanceResult] = await Promise.all([
        supabase.from('students').select('id, name, department').order('name'),
        supabase
          .from('attendances')
          .select('id, student_id, department, scanned_at, status')
          .eq('event_name', eventName)
          .order('scanned_at', { ascending: false })
      ])

      if (!active) return

      if (studentsResult.error || attendanceResult.error) {
        setErrorMessage(studentsResult.error?.message || attendanceResult.error.message)
      } else {
        setStudents(studentsResult.data || [])
        setAttendanceRecords(attendanceResult.data || [])
      }

      setIsLoading(false)
    }

    loadAttendance()
    return () => {
      active = false
    }
  }, [eventName])

  const latestAttendanceByStudent = useMemo(() => {
    const records = new Map()
    for (const record of attendanceRecords) {
      if (!records.has(record.student_id)) records.set(record.student_id, record)
    }
    return records
  }, [attendanceRecords])

  const visibleStudents = students.filter((student) => {
    const record = latestAttendanceByStudent.get(student.id)
    const status = record?.status || 'Absent'
    return !statusFilter || status === statusFilter
  })

  async function saveStatus(student) {
    const status = selectedStatuses[student.id] || latestAttendanceByStudent.get(student.id)?.status || 'Absent'
    const attendance = latestAttendanceByStudent.get(student.id)
    setSavingStudentId(student.id)
    setErrorMessage('')
    setMessage('')

    const result = attendance
      ? await supabase.from('attendances').update({ status }).eq('id', attendance.id).select('id, student_id, department, scanned_at, status').single()
      : await supabase.from('attendances').insert({
        student_id: student.id,
        department: student.department,
        event_name: eventName,
        status
      }).select('id, student_id, department, scanned_at, status').single()

    setSavingStudentId('')
    if (result.error) {
      setErrorMessage(result.error.message)
      return
    }

    setAttendanceRecords((records) => [
      result.data,
      ...records.filter((record) => record.id !== result.data.id)
    ])
    setSelectedStatuses((current) => ({ ...current, [student.id]: result.data.status }))
    setMessage(`Attendance updated for ${student.name}.`)
  }

  async function deleteAttendance(student) {
    const attendance = latestAttendanceByStudent.get(student.id)
    if (!attendance) return

    setDeletingStudentId(student.id)
    setErrorMessage('')
    setMessage('')
    const { error } = await supabase.from('attendances').delete().eq('id', attendance.id)
    setDeletingStudentId('')

    if (error) {
      setErrorMessage(error.message)
      return
    }

    setAttendanceRecords((records) => records.filter((record) => record.id !== attendance.id))
    setSelectedStatuses((current) => ({ ...current, [student.id]: 'Absent' }))
    setMessage(`Attendance record deleted for ${student.name}.`)
  }

  return (
    <div className="app-shell container">
      <NavBar activePage="attendance" onNavigate={onNavigate} />

      <div className="dashboard-header">
        <div className="header-left">
          <h1>Attendance</h1>
          <p>Manage attendance status for each student and event.</p>
        </div>
      </div>

      <div className="card attendance-card">
        <div className="attendance-toolbar">
          <label className="attendance-event-select">
            <span>Event</span>
            <select value={eventName} onChange={(event) => setEventName(event.target.value)}>
              {EVENT_OPTIONS.map((event) => <option key={event} value={event}>{event}</option>)}
            </select>
          </label>

          <div className="attendance-status-filters" aria-label="Filter students by attendance status">
            {ATTENDANCE_STATUSES.map((status) => (
              <button
                className={`neon-button${statusFilter === status ? ' primary' : ''}`}
                key={status}
                type="button"
                aria-pressed={statusFilter === status}
                onClick={() => setStatusFilter((current) => current === status ? '' : status)}
              >
                {status}
              </button>
            ))}
          </div>
        </div>

        {errorMessage && <p className="attendance-message attendance-error" role="alert">{errorMessage}</p>}
        {message && <p className="attendance-message" role="status">{message}</p>}

        {isLoading ? <p>Loading students and attendance...</p> : students.length === 0 ? (
          <p>No students found. Add students before managing attendance.</p>
        ) : visibleStudents.length === 0 ? (
          <p>No students match this status.</p>
        ) : (
          <div className="table-scroll">
            <table className="table attendance-table">
              <thead>
                <tr>
                  <th>Student</th>
                  <th>ID</th>
                  <th>Department</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {visibleStudents.map((student) => {
                  const attendance = latestAttendanceByStudent.get(student.id)
                  const status = selectedStatuses[student.id] || attendance?.status || 'Absent'
                  const isSaving = savingStudentId === student.id
                  const isDeleting = deletingStudentId === student.id

                  return (
                    <tr key={student.id}>
                      <td>{student.name}</td>
                      <td>{student.id}</td>
                      <td>{student.department || '—'}</td>
                      <td>
                        <select
                          aria-label={`Attendance status for ${student.name}`}
                          value={status}
                          onChange={(event) => setSelectedStatuses((current) => ({
                            ...current,
                            [student.id]: event.target.value
                          }))}
                        >
                          {ATTENDANCE_STATUSES.map((option) => <option key={option} value={option}>{option}</option>)}
                        </select>
                      </td>
                      <td className="attendance-row-actions">
                        <button className="neon-button primary" type="button" disabled={isSaving || isDeleting} onClick={() => saveStatus(student)}>
                          {isSaving ? 'Saving...' : attendance ? 'Update' : 'Create'}
                        </button>
                        {attendance && (
                          <button className="neon-button" type="button" disabled={isSaving || isDeleting} onClick={() => deleteAttendance(student)}>
                            {isDeleting ? 'Deleting...' : 'Delete'}
                          </button>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
