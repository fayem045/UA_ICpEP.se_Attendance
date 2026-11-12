import React, { useEffect, useMemo, useState } from 'react'
import NavBar from '../components/NavBar'
import { supabase } from '../lib/supabaseClient'

export default function Members({ profile, onNavigate }) {
  const [members, setMembers] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('all')

  async function loadPeople() {
    setIsLoading(true)
    setErrorMessage('')
    const [studentsResult, facultyResult] = await Promise.all([
      supabase.from('students').select('id, name, department').order('name'),
      supabase.from('faculty').select('id, name, department').order('name')
    ])

    if (studentsResult.error || facultyResult.error) {
      setErrorMessage(studentsResult.error?.message || facultyResult.error.message)
    } else {
      setMembers([
        ...(studentsResult.data || []).map((member) => ({ ...member, type: 'Student' })),
        ...(facultyResult.data || []).map((member) => ({ ...member, type: 'Faculty' }))
      ].sort((left, right) => (left.name || '').localeCompare(right.name || '')))
    }
    setIsLoading(false)
  }

  useEffect(() => { loadPeople() }, [])

  const visibleMembers = useMemo(() => {
    const query = search.trim().toLowerCase()
    return members.filter((member) => {
      const matchesType = typeFilter === 'all' || member.type.toLowerCase() === typeFilter
      const matchesQuery = !query || [member.id, member.name, member.department, member.type]
        .some((value) => String(value || '').toLowerCase().includes(query))
      return matchesType && matchesQuery
    })
  }, [members, search, typeFilter])

  return (
    <div className="app-shell container">
      <NavBar activePage="members" onNavigate={onNavigate} profile={profile} />
      <div className="dashboard-header">
        <div className="header-left">
          <h1>Members</h1>
          <p>Registered students and faculty members.</p>
        </div>
        <div className="header-actions">
          <strong>{members.length} total</strong>
          <button className="neon-button" type="button" onClick={loadPeople} disabled={isLoading}>
            {isLoading ? 'Refreshing…' : 'Refresh'}
          </button>
        </div>
      </div>

      <section className="card page-card">
        <div className="filter-toolbar">
          <label className="form-field search-field">
            <span>Search members</span>
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Name, ID, department…" />
          </label>
          <label className="form-field type-filter">
            <span>Member type</span>
            <select value={typeFilter} onChange={(event) => setTypeFilter(event.target.value)}>
              <option value="all">All members</option>
              <option value="student">Students</option>
              <option value="faculty">Faculty</option>
            </select>
          </label>
        </div>

        {errorMessage && <p className="status-message error" role="alert">Unable to load members: {errorMessage}</p>}
        {isLoading ? <p className="muted-text">Loading members…</p> : !errorMessage && visibleMembers.length === 0 ? (
          <div className="empty-state">{members.length ? 'No members match your search.' : 'No members are registered yet. Add them from the Dashboard QR generator.'}</div>
        ) : !errorMessage && (
          <div className="table-scroll">
            <table className="table data-table">
              <thead><tr><th>Type</th><th>ID / Member number</th><th>Name</th><th>Department / Unit</th></tr></thead>
              <tbody>
                {visibleMembers.map((member) => (
                  <tr key={`${member.type}-${member.id}`}>
                    <td>{member.type}</td>
                    <td>{member.id}</td>
                    <td>{member.name || '—'}</td>
                    <td>{member.department || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}
