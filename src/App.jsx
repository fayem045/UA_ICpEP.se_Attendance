import React, { useEffect, useState } from 'react'
import { supabase } from './lib/supabaseClient'
import Login from './components/Login'
import AdminView from './components/AdminView'
import StudentView from './components/StudentView'

export default function App() {
  const [session, setSession] = useState(null)
  const [profile, setProfile] = useState(null)

  useEffect(() => {
    checkSession()
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session?.access_token ? session : null)
      if (session?.user) fetchProfile(session.user.id)
    })
    return () => sub?.subscription?.unsubscribe?.()
  }, [])

  async function checkSession() {
    const {
      data: { session }
    } = await supabase.auth.getSession()
    setSession(session)
    if (session?.user) fetchProfile(session.user.id)
  }

  async function fetchProfile(userId) {
    const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).single()
    if (error) console.warn('no profile', error)
    else setProfile(data)
  }

  if (!session) return <Login />

  // If profile isn't loaded yet, show a simple loading state
  if (!profile) return <div className="container"><p>Loading profile...</p></div>

  return (
    <div>
      {profile.role === 'admin' ? (
        <AdminView profile={profile} />
      ) : (
        <StudentView profile={profile} />
      )}
    </div>
  )
}
