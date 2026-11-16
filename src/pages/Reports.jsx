import React, { useEffect, useMemo, useState } from 'react'
import NavBar from '../components/NavBar'
import { supabase } from '../lib/supabaseClient'

export default function Reports ({profile, onNavigate}){
    return(
        // start to create whatever bet content of page
        <div className="app-shell container">
            {/*start turn on the navbar */}
            <Navbar activePage="reports" onNavigate={onNavigate} profile={profile} />
            {/* end turn on */}
            <h1>Report Section is  Still under Development</h1>
        </div>
    )
}
