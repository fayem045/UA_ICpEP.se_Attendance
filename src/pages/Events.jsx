import React from 'react'
import NavBar from '../components/NavBar'

export default function Events ({ profile, onNavigate }){
    return(
        <div className="app-shell container">
            <NavBar activePage="events" onNavigate={onNavigate} />
            <h1>Events</h1>
        </div>
    )
}