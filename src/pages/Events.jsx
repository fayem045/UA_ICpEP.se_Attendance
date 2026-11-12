import React, { useEffect, useState } from 'react'
import NavBar from '../components/NavBar'
import { supabase } from '../lib/supabaseClient'

const emptyForm = { name: '', description: '', location: '', startsAt: '', endsAt: '' }

function toInputDate(value) {
  if (!value) return ''
  const date = new Date(value)
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000)
  return local.toISOString().slice(0, 16)
}

function formatDate(value) {
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value))
}

export default function Events({ profile, onNavigate }) {
  const [events, setEvents] = useState([])
  const [form, setForm] = useState(emptyForm)
  const [editingId, setEditingId] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [deletingId, setDeletingId] = useState('')
  const [errorMessage, setErrorMessage] = useState('')
  const [message, setMessage] = useState('')

  async function loadEvents() {
    setIsLoading(true)
    setErrorMessage('')
    const { data, error } = await supabase
      .from('events')
      .select('id, name, description, location, starts_at, ends_at, created_at')
      .order('starts_at', { ascending: true })

    if (error) setErrorMessage(error.message)
    else setEvents(data || [])
    setIsLoading(false)
  }

  useEffect(() => { loadEvents() }, [])

  function updateField(event) {
    const { name, value } = event.target
    setForm((current) => ({ ...current, [name]: value }))
  }

  function beginEdit(event) {
    setEditingId(event.id)
    setForm({
      name: event.name || '',
      description: event.description || '',
      location: event.location || '',
      startsAt: toInputDate(event.starts_at),
      endsAt: toInputDate(event.ends_at)
    })
    setMessage('')
    setErrorMessage('')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function cancelEdit() {
    setEditingId('')
    setForm(emptyForm)
    setErrorMessage('')
    setMessage('')
  }

  async function saveEvent(event) {
    event.preventDefault()
    setIsSaving(true)
    setErrorMessage('')
    setMessage('')

    const startsAt = new Date(form.startsAt)
    const endsAt = form.endsAt ? new Date(form.endsAt) : null
    if (Number.isNaN(startsAt.getTime()) || (endsAt && Number.isNaN(endsAt.getTime()))) {
      setErrorMessage('Enter a valid start and end time.')
      setIsSaving(false)
      return
    }
    if (endsAt && endsAt < startsAt) {
      setErrorMessage('The end time must be after the start time.')
      setIsSaving(false)
      return
    }

    const values = {
      name: form.name.trim(),
      description: form.description.trim() || null,
      location: form.location.trim() || null,
      starts_at: startsAt.toISOString(),
      ends_at: endsAt?.toISOString() || null,
      updated_at: new Date().toISOString()
    }
    const result = editingId
      ? await supabase.from('events').update(values).eq('id', editingId).select().single()
      : await supabase.from('events').insert(values).select().single()

    setIsSaving(false)
    if (result.error) {
      setErrorMessage(result.error.message)
      return
    }

    setMessage(editingId ? 'Event updated.' : 'Event created.')
    setEditingId('')
    setForm(emptyForm)
    await loadEvents()
  }

  async function deleteEvent(event) {
    if (!window.confirm(`Delete “${event.name}”? Attendance records will be kept.`)) return
    setDeletingId(event.id)
    setErrorMessage('')
    setMessage('')
    const { error } = await supabase.from('events').delete().eq('id', event.id)
    setDeletingId('')
    if (error) setErrorMessage(error.message)
    else {
      setEvents((current) => current.filter((item) => item.id !== event.id))
      if (editingId === event.id) cancelEdit()
      setMessage('Event deleted. Its attendance records were kept.')
    }
  }

  const now = Date.now()

  return (
    <div className="app-shell container">
      <NavBar activePage="events" onNavigate={onNavigate} profile={profile} />
      <div className="dashboard-header">
        <div className="header-left">
          <h1>Events</h1>
          <p>Create and manage chapter events and their attendance sessions.</p>
        </div>
        <button className="neon-button" type="button" onClick={loadEvents} disabled={isLoading}>
          {isLoading ? 'Refreshing…' : 'Refresh'}
        </button>
      </div>

      <section className="card page-card">
        <h2 className="section-heading">{editingId ? 'Edit event' : 'Create an event'}</h2>
        <form className="data-form" onSubmit={saveEvent}>
          <label className="form-field">
            <span>Event name</span>
            <input name="name" value={form.name} onChange={updateField} maxLength={120} required />
          </label>
          <label className="form-field">
            <span>Location</span>
            <input name="location" value={form.location} onChange={updateField} maxLength={160} placeholder="Room, building, or online" />
          </label>
          <label className="form-field">
            <span>Starts</span>
            <input name="startsAt" type="datetime-local" value={form.startsAt} onChange={updateField} required />
          </label>
          <label className="form-field">
            <span>Ends</span>
            <input name="endsAt" type="datetime-local" value={form.endsAt} onChange={updateField} />
          </label>
          <label className="form-field form-field-wide">
            <span>Description</span>
            <textarea name="description" rows="3" value={form.description} onChange={updateField} maxLength={1000} placeholder="Optional event details" />
          </label>
          <div className="form-actions form-field-wide">
            <button className="neon-button primary" type="submit" disabled={isSaving}>
              {isSaving ? 'Saving…' : editingId ? 'Save changes' : 'Create event'}
            </button>
            {editingId && <button className="neon-button" type="button" onClick={cancelEdit} disabled={isSaving}>Cancel</button>}
          </div>
        </form>
        {errorMessage && <p className="status-message error" role="alert">{errorMessage}</p>}
        {message && <p className="status-message" role="status">{message}</p>}
      </section>

      <section className="card page-card">
        <div className="section-heading-row">
          <div>
            <h2 className="section-heading">Event schedule</h2>
            <p className="muted-text">{events.length} event{events.length === 1 ? '' : 's'}</p>
          </div>
        </div>
        {isLoading ? <p className="muted-text">Loading events…</p> : events.length === 0 ? (
          <div className="empty-state">No events yet. Create one above to start taking attendance.</div>
        ) : (
          <div className="event-grid">
            {events.map((event) => {
              const upcoming = new Date(event.starts_at).getTime() >= now
              return (
                <article className="event-card" key={event.id}>
                  <div className="event-card-top">
                    <span className={`badge ${upcoming ? 'present' : 'late'}`}>{upcoming ? 'Upcoming' : 'Past'}</span>
                    <div className="event-actions">
                      <button className="text-button" type="button" onClick={() => beginEdit(event)}>Edit</button>
                      <button className="text-button danger-text" type="button" disabled={deletingId === event.id} onClick={() => deleteEvent(event)}>
                        {deletingId === event.id ? 'Deleting…' : 'Delete'}
                      </button>
                    </div>
                  </div>
                  <h3>{event.name}</h3>
                  <p className="muted-text">{formatDate(event.starts_at)}{event.ends_at ? ` – ${formatDate(event.ends_at)}` : ''}</p>
                  {event.location && <p>{event.location}</p>}
                  {event.description && <p className="event-description">{event.description}</p>}
                </article>
              )
            })}
          </div>
        )}
      </section>
    </div>
  )
}
