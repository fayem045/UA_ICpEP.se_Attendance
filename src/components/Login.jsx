import React, { useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import './login.css'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [providerLoading, setProviderLoading] = useState('')
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

  async function handleProviderLogin(provider) {
    setProviderLoading(provider)
    setMessage('')
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: window.location.origin },
    })
    if (error) {
      setProviderLoading('')
      setMessage(error.message)
    }
  }

  return (
    <main className="login-page">

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
    
      <section className="login-form-panel">
        <div className="card login-card">
        <p className="login-kicker">SECURE ATTENDANCE PORTAL</p>
        <h2>Welcome back</h2>
        <p className="login-intro">Log in with your existing account to continue.</p>
        <form onSubmit={handleLogin}>
          <label htmlFor="login-email">Email address</label>
          <input id="login-email" value={email} onChange={(e) => setEmail(e.target.value)} type="email" placeholder="you@example.com" autoComplete="email" required />
          <label htmlFor="login-password">Password</label>
          <input id="login-password" value={password} onChange={(e) => setPassword(e.target.value)} type="password" placeholder="Enter your password" autoComplete="current-password" required />
          <button className="login-submit" disabled={loading || providerLoading !== ''} type="submit">{loading ? 'Logging in...' : 'Log In'}</button>
          <button className="login-signup-submit" disabled={loading || providerLoading !== ''} type="submit">{loading ? 'Creating account...' : 'Sign Up'}</button>
          <div className="login-divider" aria-hidden="true"><span>or continue with</span></div>
          <div className="login-providers">
            <button
              className="login-provider login-provider-google"
              disabled={loading || providerLoading !== ''}
              onClick={() => handleProviderLogin('google')}
              type="button"
            >
              <span className="provider-mark">G</span>
              {providerLoading === 'google' ? 'Connecting...' : 'Continue with Google'}
            </button>
            <button
              className="login-provider login-provider-facebook"
              disabled={loading || providerLoading !== ''}
              onClick={() => handleProviderLogin('facebook')}
              type="button"
            >
              <span className="provider-mark">f</span>
              {providerLoading === 'facebook' ? 'Connecting...' : 'Continue with Facebook'}
            </button>
          </div>
        </form>
        {message && <p>{message}</p>}
        </div>
      </section>
    </main>
  )
}
