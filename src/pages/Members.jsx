import React, { useEffect, useMemo, useState } from 'react'
import NavBar from '../components/NavBar'
import { API_BASE_URL, authFetch } from '../lib/api'
import { supabase } from '../lib/supabaseClient'

const EMPTY_FORM = { name: '', yearLevel: '' }

async function adminRequest(path, method, values) {
  let response
  try {
    response = await authFetch(path, {
      method,
      ...(values ? { body: JSON.stringify(values) } : {})
    })
  } catch (error) {
    if (error instanceof TypeError) {
      throw new Error(`Could not reach the member-management API at ${API_BASE_URL}. Check that the backend is running and allows this site's origin.`)
    }
    throw error
  }
  const data = await response.json().catch(() => ({}))
  if (!response.ok) {
    const error = new Error(data.message || `Request failed with status ${response.status}.`)
    error.status = response.status
    error.memberDeleted = data.memberDeleted === true
    throw error
  }
  return data
}

export default function Members({ profile, onNavigate }) {
  const [members, setMembers] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')
  const [message, setMessage] = useState('')
  const [search, setSearch] = useState('')
  const [editingMember, setEditingMember] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [savingId, setSavingId] = useState('')
  const [deletingId, setDeletingId] = useState('')

  async function loadPeople() {
    setIsLoading(true)
    setErrorMessage('')
    const studentsResult = await supabase.from('students').select('id, name, year_level').order('name')

    if (studentsResult.error) {
      setErrorMessage(studentsResult.error.message)
    } else {
      setMembers(studentsResult.data || [])
    }
    setIsLoading(false)
  }

  useEffect(() => { loadPeople() }, [])

  function beginEdit(member) {
    setEditingMember(member)
    setForm({ name: member.name || '', yearLevel: member.year_level || '' })
    setErrorMessage('')
    setMessage('')
  }

  function cancelEdit() {
    setEditingMember(null)
    setForm(EMPTY_FORM)
    setErrorMessage('')
    setMessage('')
  }

  async function saveMember(event) {
    event.preventDefault()
    if (!editingMember) return

    setSavingId(editingMember.id)
    setErrorMessage('')
    setMessage('')
    try {
      const { member: updatedMember } = await adminRequest(
        `/api/admin/students/${encodeURIComponent(editingMember.id)}`,
        'PATCH',
        { name: form.name.trim(), yearLevel: form.yearLevel.trim() }
      )
      setMembers((current) => current.map((currentMember) => (
        currentMember.id === editingMember.id
          ? { ...currentMember, name: updatedMember.name, year_level: updatedMember.year_level }
          : currentMember
      )).sort((left, right) => (left.name || '').localeCompare(right.name || '')))
      setEditingMember(null)
      setForm(EMPTY_FORM)
      setMessage('Student information updated.')
    } catch (error) {
      setErrorMessage(error.message || 'Member information could not be updated.')
    } finally {
      setSavingId('')
    }
  }

  async function deleteMember(member) {
    const confirmed = window.confirm(`Delete ${member.name || member.id}? This removes the student record, linked attendance records, and linked Supabase sign-in account. This cannot be undone.`)
    if (!confirmed) return

    setDeletingId(member.id)
    setErrorMessage('')
    setMessage('')
    try {
      const result = await adminRequest(
        `/api/admin/students/${encodeURIComponent(member.id)}`,
        'DELETE'
      )
      setMembers((current) => current.filter((currentMember) => (
        currentMember.id !== member.id
      )))
      if (editingMember?.id === member.id) {
        setEditingMember(null)
        setForm(EMPTY_FORM)
      }
      setMessage(result.message)
    } catch (error) {
      if (error.status === 404) await loadPeople()
      if (error.memberDeleted) {
        setMembers((current) => current.filter((currentMember) => (
          currentMember.id !== member.id
        )))
        if (editingMember?.id === member.id) {
          setEditingMember(null)
          setForm(EMPTY_FORM)
        }
      }
      setErrorMessage(error.message || 'Member could not be deleted.')
    } finally {
      setDeletingId('')
    }
  }

  const visibleMembers = useMemo(() => {
    const query = search.trim().toLowerCase()
    return members.filter((member) => {
      const matchesQuery = !query || [member.id, member.name, member.year_level]
        .some((value) => String(value || '').toLowerCase().includes(query))
      return matchesQuery
    })
  }, [members, search])

  return (
    <div className="app-shell container">
      <NavBar activePage="members" onNavigate={onNavigate} profile={profile} />
      <div className="dashboard-header">
        <div className="header-left">
          <h1>Members</h1>
          <p>Registered students.</p>
        </div>
        <div className="header-actions">
          <strong>{members.length} total</strong>
          <button className="neon-button" type="button" onClick={loadPeople} disabled={isLoading || savingId !== '' || deletingId !== ''}>
            {isLoading ? 'Refreshing…' : 'Refresh'}
          </button>
        </div>
      </div>

      <section className="card page-card">
        {editingMember && (
          <form className="data-form" onSubmit={saveMember}>
            <h2 className="section-heading form-field-wide">Edit student</h2>
            <label className="form-field">
              <span>Member ID (cannot be changed)</span>
              <input value={editingMember.id} readOnly />
            </label>
            <label className="form-field">
              <span>Name</span>
              <input value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} maxLength={160} required />
            </label>
            <label className="form-field form-field-wide">
              <span>Year Level</span>
              <input value={form.yearLevel} onChange={(event) => setForm((current) => ({ ...current, yearLevel: event.target.value }))} maxLength={160} />
            </label>
            <div className="form-actions form-field-wide">
              <button className="neon-button primary" type="submit" disabled={savingId !== ''}>
                {savingId ? 'Saving…' : 'Save changes'}
              </button>
              <button className="neon-button" type="button" onClick={cancelEdit} disabled={savingId !== '' || deletingId !== ''}>Cancel</button>
            </div>
          </form>
        )}
        <div className="filter-toolbar">
          <label className="form-field search-field">
            <span>Search members</span>
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Name, ID, year level…" />
          </label>
        </div>

        {errorMessage && <p className="status-message error" role="alert">{errorMessage}</p>}
        {message && <p className="status-message" role="status">{message}</p>}
        {isLoading ? <p className="muted-text">Loading members…</p> : !errorMessage && visibleMembers.length === 0 ? (
          <div className="empty-state">{members.length ? 'No students match your search.' : 'No students are registered yet. Add them from the Dashboard QR generator.'}</div>
        ) : !errorMessage && (
          <div className="table-scroll">
            <table className="table data-table">
              <thead><tr><th>Student ID</th><th>Name</th><th>Year Level</th><th>Actions</th></tr></thead>
              <tbody>
                {visibleMembers.map((member) => (
                  <tr key={member.id}>
                    <td>{member.id}</td>
                    <td>{member.name || '—'}</td>
                    <td>{member.year_level || '—'}</td>
                    <td>
                      <div className="event-actions">
                        <button className="text-button" type="button" onClick={() => beginEdit(member)} disabled={deletingId !== '' || savingId !== ''}>Edit</button>
                        <button className="text-button danger-text" type="button" onClick={() => deleteMember(member)} disabled={deletingId !== '' || savingId !== ''}>
                          {deletingId === member.id ? 'Deleting…' : 'Delete'}
                        </button>
                      </div>
                    </td>
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
