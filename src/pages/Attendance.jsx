import React from 'react'
import NavBar from '../components/NavBar'

export default function Attendance ({ profile, onNavigate }){
    return(
        <div>
            <NavBar activePage="attendance" onNavigate={onNavigate} />
            <h2>Attendance</h2>
        </div>
    )
}