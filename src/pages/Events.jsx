import React, { useEffect, useState } from 'react'
import NavBar from '../components/NavBar'
import { supabase } from '../lib/supabaseClient'

export default function Events ({ profile, onNavigate }){
    return(
        <div>
            <NavBar activePage="events" onNavigate={onNavigate} />
            <h2>Events</h2>
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
