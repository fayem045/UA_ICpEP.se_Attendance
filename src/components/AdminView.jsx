import React, { Suspense, lazy } from 'react'

const Dashboard = lazy(() => import('../pages/Dashboard'))
const Attendance = lazy(() => import('../pages/Attendance'))
const Events = lazy(() => import('../pages/Events'))
const Members = lazy(() => import('../pages/Members'))
const Reports = lazy(() => import('../pages/Reports'))

export default function AdminView({ profile }){
  const validPages = new Set(['dashboard', 'attendance', 'events', 'members', 'reports'])

  function getPageFromHash() {
    const hashPage = window.location.hash.replace(/^#/, '')
    return validPages.has(hashPage) ? hashPage : 'dashboard'
  }

  const [page, setPage] = React.useState(getPageFromHash)

  React.useEffect(() => {
    function handleHashChange() {
      setPage(getPageFromHash())
    }
    window.addEventListener('hashchange', handleHashChange)
    window.addEventListener('popstate', handleHashChange)
    return () => {
      window.removeEventListener('hashchange', handleHashChange)
      window.removeEventListener('popstate', handleHashChange)
    }
  }, [])

  function navigate(pageName) {
    if (!validPages.has(pageName)) return
    setPage(pageName)
    if (window.location.hash !== `#${pageName}`) {
      window.history.pushState(null, '', `#${pageName}`)
    }
  }

  let activePage
  if (page === 'attendance') activePage = <Attendance profile={profile} onNavigate={navigate} />
  else if (page === 'events') activePage = <Events profile={profile} onNavigate={navigate} />
  else if (page === 'members') activePage = <Members profile={profile} onNavigate={navigate} />
  else if (page === 'reports') activePage = <Reports profile={profile} onNavigate={navigate} />
  else activePage = <Dashboard profile={profile} onNavigate={navigate} />

  return <Suspense fallback={<main className="app-shell container"><div className="card">Loading page…</div></main>}>{activePage}</Suspense>
}
