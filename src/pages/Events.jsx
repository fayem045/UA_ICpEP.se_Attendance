import React from 'react'
import NavBar from '../components/NavBar'

export default function Events ({ profile, onNavigate }){
    return(
        <div>
            <NavBar activePage="events" onNavigate={onNavigate} />
            <h2>Events</h2>
        </div>
    )
}