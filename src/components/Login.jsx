import React, { useState } from 'react'
import { supabase } from '../lib/supabaseClient'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  async function handleLogin(e) {
    e.preventDefault()
    setLoading(true)
    setMessage('')
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    setLoading(false)
    if (error) setMessage(error.message)
    else setMessage('Logged in')
  }

  return (
    <div className="container">
      <div className="card" style={{ maxWidth: 420, margin: '40px auto' }}>
        <h2>Sign In</h2>
        <form onSubmit={handleLogin}>
          <label>Email</label>
          <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" />
          <label>Password</label>
          <input value={password} onChange={(e) => setPassword(e.target.value)} type="password" />
          <button disabled={loading} style={{ marginTop: 12 }} type="submit">{loading ? 'Signing...' : 'Sign In'}</button>
        </form>
        {message && <p>{message}</p>}
        <p style={{ fontSize: 13, marginTop: 12 }}>If you don't have an account, create one in Supabase Auth and add a `profiles` row with `role` set to 'admin' or 'student'.</p>
      </div>
    </div>
  )
}
