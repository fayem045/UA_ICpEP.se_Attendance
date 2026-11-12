import React, { useEffect, useMemo, useState } from 'react'
import NavBar from '../components/NavBar'
import { supabase } from '../lib/supabaseClient'

const STATUSES = ['Present', 'Late', 'Absent']
const PAGE_SIZE = 1000
const MAX_REPORT_ROWS = 10000

function dateInputValue(date) {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000)
  return local.toISOString().slice(0, 10)
}

function csvCell(value) {
  const text = String(value ?? '')
  return `"${text.replaceAll('"', '""')}"`
}

function downloadCsv(filename, rows) {
  const blob = new Blob([`\uFEFF${rows.map((row) => row.map(csvCell).join(',')).join('\r\n')}`], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}

function formatDate(value) {
  return value ? new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value)) : '—'
}

export default function Reports({ profile, onNavigate }) {
  const today = new Date()
  const thirtyDaysAgo = new Date(today)
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 29)
  const [events, setEvents] = useState([])
  const [eventFilter, setEventFilter] = useState('all')
  const [fromDate, setFromDate] = useState(dateInputValue(thirtyDaysAgo))
  const [toDate, setToDate] = useState(dateInputValue(today))
  const [records, setRecords] = useState([])
  const [memberNames, setMemberNames] = useState({})
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')
  const [truncated, setTruncated] = useState(false)

  useEffect(() => {
    let active = true
    supabase.from('events').select('id, name').order('starts_at', { ascending: false }).then(({ data, error }) => {
      if (!active) return
      if (error) setErrorMessage(error.message)
      else setEvents(data || [])
    })
    return () => { active = false }
  }, [])

  async function loadReport() {
    setIsLoading(true)
    setErrorMessage('')
    setTruncated(false)
    if (fromDate && toDate && fromDate > toDate) {
      setErrorMessage('The start date must be on or before the end date.')
      setIsLoading(false)
      return
    }

    const start = fromDate ? new Date(`${fromDate}T00:00:00`).toISOString() : null
    const end = toDate ? new Date(new Date(`${toDate}T00:00:00`).getTime() + 86400000).toISOString() : null
    const loaded = []
    let offset = 0
    let more = true

    while (more && loaded.length < MAX_REPORT_ROWS) {
      let query = supabase.from('attendances')
        .select('id, student_id, event_id, event_name, department, scanned_at, status')
        .order('scanned_at', { ascending: false })
        .range(offset, offset + PAGE_SIZE - 1)
      if (eventFilter !== 'all') query = query.eq('event_id', eventFilter)
      if (start) query = query.gte('scanned_at', start)
      if (end) query = query.lt('scanned_at', end)
      const { data, error } = await query
      if (error) {
        setErrorMessage(error.message)
        setIsLoading(false)
        return
      }
      const batch = data || []
      loaded.push(...batch)
      more = batch.length === PAGE_SIZE
      offset += PAGE_SIZE
    }
    setTruncated(more)
    setRecords(loaded.slice(0, MAX_REPORT_ROWS))

    const studentIds = [...new Set(loaded.map((record) => record.student_id).filter(Boolean))]
    const names = {}
    for (let index = 0; index < studentIds.length; index += 100) {
      const chunk = studentIds.slice(index, index + 100)
      const { data, error } = await supabase.from('students').select('id, name, department').in('id', chunk)
      if (error) {
        setErrorMessage(error.message)
        setIsLoading(false)
        return
      }
      for (const student of data || []) names[student.id] = student
    }
    setMemberNames(names)
    setIsLoading(false)
  }

  useEffect(() => { loadReport() }, [])

  const summary = useMemo(() => {
    const result = { Present: 0, Late: 0, Absent: 0 }
    const departments = new Map()
    const uniqueStudents = new Set()
    for (const record of records) {
      const status = STATUSES.includes(record.status) ? record.status : 'Present'
      result[status] += 1
      if (record.student_id) uniqueStudents.add(record.student_id)
      const department = record.department || memberNames[record.student_id]?.department || 'Unspecified'
      departments.set(department, (departments.get(department) || 0) + 1)
    }
    return { ...result, uniqueStudents: uniqueStudents.size, departments: [...departments.entries()].sort((a, b) => b[1] - a[1]) }
  }, [records, memberNames])

  const total = summary.Present + summary.Late + summary.Absent
  const attendanceRate = total ? Math.round(((summary.Present + summary.Late) / total) * 100) : 0

  function exportReport() {
    const rows = [
      ['Student ID', 'Name', 'Department', 'Event', 'Scanned at', 'Status'],
      ...records.map((record) => [
        record.student_id,
        memberNames[record.student_id]?.name || '',
        record.department || memberNames[record.student_id]?.department || '',
        record.event_name,
        record.scanned_at,
        record.status
      ])
    ]
    downloadCsv(`attendance-report-${fromDate || 'all'}-to-${toDate || 'all'}.csv`, rows)
  }

  return (
    <div className="app-shell container">
      <NavBar activePage="reports" onNavigate={onNavigate} profile={profile} />
      <div className="dashboard-header">
        <div className="header-left">
          <h1>Reports</h1>
          <p>Review attendance totals by event and date range, then export the records.</p>
        </div>
        <button className="neon-button" type="button" onClick={exportReport} disabled={isLoading || records.length === 0}>Export CSV</button>
      </div>

      <section className="card page-card">
        <div className="report-filters">
          <label className="form-field">
            <span>Event</span>
            <select value={eventFilter} onChange={(event) => setEventFilter(event.target.value)}>
              <option value="all">All events</option>
              {events.map((event) => <option key={event.id} value={event.id}>{event.name}</option>)}
            </select>
          </label>
          <label className="form-field"><span>From</span><input type="date" value={fromDate} onChange={(event) => setFromDate(event.target.value)} /></label>
          <label className="form-field"><span>To</span><input type="date" value={toDate} onChange={(event) => setToDate(event.target.value)} /></label>
          <button className="neon-button primary report-run" type="button" onClick={loadReport} disabled={isLoading}>{isLoading ? 'Loading…' : 'Apply filters'}</button>
        </div>
        {errorMessage && <p className="status-message error" role="alert">{errorMessage}</p>}
        {truncated && <p className="status-message">Showing the first {MAX_REPORT_ROWS.toLocaleString()} records. Narrow the date range to export a smaller report.</p>}
      </section>

      <div className="stats-grid report-stats">
        <div className="stat-card"><span className="value">{total}</span><span className="label">Attendance records</span></div>
        <div className="stat-card"><span className="value">{summary.uniqueStudents}</span><span className="label">Unique students</span></div>
        <div className="stat-card"><span className="value">{total ? `${attendanceRate}%` : '—'}</span><span className="label">Present or late</span></div>
        <div className="stat-card"><span className="value">{summary.Absent}</span><span className="label">Marked absent</span></div>
      </div>

      <div className="dashboard-content-grid dashboard-content-grid--analytics">
        <section className="card page-card">
          <h2 className="section-heading">Status breakdown</h2>
          {STATUSES.map((status) => {
            const count = summary[status]
            const percent = total ? Math.round((count / total) * 100) : 0
            return <div className="report-bar-row" key={status}>
              <div className="report-bar-label"><span>{status}</span><strong>{count} · {percent}%</strong></div>
              <div className="report-bar-track"><div className={`report-bar ${status.toLowerCase()}`} style={{ width: `${percent}%` }} /></div>
            </div>
          })}
        </section>
        <section className="card page-card">
          <h2 className="section-heading">By department</h2>
          {summary.departments.length ? <ul className="report-department-list">
            {summary.departments.map(([department, count]) => <li key={department}><span>{department}</span><strong>{count}</strong></li>)}
          </ul> : <p className="muted-text">No records in this range.</p>}
        </section>
      </div>

      <section className="card page-card">
        <h2 className="section-heading">Attendance records</h2>
        {isLoading ? <p className="muted-text">Loading report…</p> : records.length === 0 ? <div className="empty-state">No attendance records match this report.</div> : (
          <div className="table-scroll">
            <table className="table data-table">
              <thead><tr><th>Student ID</th><th>Name</th><th>Department</th><th>Event</th><th>Scanned at</th><th>Status</th></tr></thead>
              <tbody>{records.map((record) => <tr key={record.id}>
                <td>{record.student_id || '—'}</td>
                <td>{memberNames[record.student_id]?.name || '—'}</td>
                <td>{record.department || memberNames[record.student_id]?.department || '—'}</td>
                <td>{record.event_name || 'General Assembly'}</td>
                <td>{formatDate(record.scanned_at)}</td>
                <td><span className={`badge ${String(record.status || 'Present').toLowerCase()}`}>{record.status || 'Present'}</span></td>
              </tr>)}</tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}
