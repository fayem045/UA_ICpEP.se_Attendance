// this are the access page of the admin
import React from 'react'
import Dashboard from '../pages/Dashboard'
import Attendance from '../pages/Attendance'

export default function AdminView({ profile }){
  const [page, setPage] = React.useState('dashboard')

  if (page === 'attendance') {
    return <Attendance profile={profile} onNavigate={setPage} />
  }

  return <Dashboard profile={profile} onNavigate={setPage} />
}
