import React, { useEffect, useState } from 'react'
import { supabase } from './lib/supabaseClient'
import AdminView from './components/AdminView'
import Login from './components/Login'
import StudentView from './components/StudentView'

const ADMIN_EMAIL = 'adminside1@gmail.com'
const STUDENT_EMAIL_PATTERN = /\.student@ua\.edu\.ph$/i

function getRole(email = '') {
  const normalizedEmail = email.trim().toLowerCase()

  if (normalizedEmail === ADMIN_EMAIL) return 'admin'
  if (STUDENT_EMAIL_PATTERN.test(normalizedEmail)) return 'student'
  return null
}

export default function App() {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true

    supabase.auth.getSession().then(({ data: { session: currentSession } }) => {
      if (mounted) {
        setSession(currentSession)
        setLoading(false)
      }
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, currentSession) => {
      setSession(currentSession)
      setLoading(false)
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [])

  if (loading) return <main className="container">Loading...</main>
  if (!session) return <Login />

  const profile = session.user
  const role = getRole(profile.email)

  if (role === 'admin') return <AdminView profile={profile} />
  if (role === 'student') return <StudentView profile={profile} />

  return (
    <main className="container">
      <div className="card">
        <h1>Account not authorized</h1>
        <p>Use the admin account or your university student email to continue.</p>
        <button onClick={() => supabase.auth.signOut()}>Sign out</button>
      </div>
    </main>
  )
}