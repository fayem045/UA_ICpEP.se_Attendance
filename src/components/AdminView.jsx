import React, { Suspense, lazy } from 'react'

const Dashboard = lazy(() => import('../pages/Dashboard'))
const Attendance = lazy(() => import('../pages/Attendance'))
const Events = lazy(() => import('../pages/Events'))
const Members = lazy(() => import('../pages/Members'))
const Reports = lazy(() => import('../pages/Reports'))

export default function AdminView({ profile }){
  const [page, setPage] = React.useState('dashboard')

  let activePage
  if (page === 'attendance') activePage = <Attendance profile={profile} onNavigate={setPage} />
  else if (page === 'events') activePage = <Events profile={profile} onNavigate={setPage} />
  else if (page === 'members') activePage = <Members profile={profile} onNavigate={setPage} />
  else if (page === 'reports') activePage = <Reports profile={profile} onNavigate={setPage} />
  else activePage = <Dashboard profile={profile} onNavigate={setPage} />

  return <Suspense fallback={<main className="app-shell container"><div className="card">Loading page…</div></main>}>{activePage}</Suspense>
}
