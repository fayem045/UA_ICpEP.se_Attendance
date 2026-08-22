import React, { useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import './login.css'

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
    <main className="login-page">
      <section className="login-form-panel">
        <div className="card login-card">
        <h2>Sign In</h2>
        <form onSubmit={handleLogin}>
          <label>Email</label>
          <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" />
          <label>Password</label>
          <input value={password} onChange={(e) => setPassword(e.target.value)} type="password" />
          <button className="login-submit" disabled={loading} type="submit">{loading ? 'Signing...' : 'Sign In'}</button>
        </form>
        {message && <p>{message}</p>}
        <p style={{ fontSize: 13, marginTop: 12 }}>If you don't have an account, create one in Supabase Auth and add a `profiles` row with `role` set to 'admin' or 'student'.</p>
        </div>
      </section>
      
    {/* leftside container image */}
    <section className="login-hero" aria-hidden="true">
      <div className="login__hero-text">
          <h2 className="login__hero-title">
            LOGIN TO BE ONE.
         <br />
             Secure Your Spot!
          </h2>
          <p className="login__hero-sub">
            Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.
        </p>
    </div>
    </section>
    </main>
  )
}
