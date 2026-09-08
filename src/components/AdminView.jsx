// this are the access page of the admin
import React from 'react'
import Dashboard from '../pages/Dashboard'
import Attendance from '../pages/Attendance'
import Events from '../pages/Events'
import Members from'../pages/Members'
import Reports from '../pages/Reports'

export default function AdminView({ profile }){
  const [page, setPage] = React.useState('dashboard')

  if (page === 'attendance') {
    return <Attendance profile={profile} onNavigate={setPage} />
  }
  // after add the import, put this to activatethe page when clicked(2ndstep, or 3rd out of 3 in activation)
  if (page === 'events') {
    return <Events profile={profile} onNavigate={setPage} />
  }
  // for next page
  if (page === 'members'){
    return <Members profile={profile} onNavigate={setPage} />
  }
  if (page === 'reports') {
    return <Reports profile={profile} onNavigate={setPage} />
  }

  return <Dashboard profile={profile} onNavigate={setPage} />
}
