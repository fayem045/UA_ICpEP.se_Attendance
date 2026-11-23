import React, { useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import './login.css'

const STUDENT_EMAIL_PATTERN = /\.student@ua\.edu\.ph$/i

export default function Login() {
  const [mode, setMode] = useState('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [resending, setResending] = useState(false)
  const [message, setMessage] = useState('')
  const [messageIsError, setMessageIsError] = useState(false)

  function changeMode(nextMode) {
    setMode(nextMode)
    setMessage('')
    setMessageIsError(false)
    setPassword('')
    setConfirmPassword('')
  }

  async function handleLogin(event) {
    event.preventDefault()
    setLoading(true)
    setMessage('')
    setMessageIsError(false)
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password
      })
      if (error) {
        const errorMessage = error.message.toLowerCase().includes('invalid login credentials')
          ? 'Invalid email or password. New accounts must confirm their email before signing in.'
          : error.message
        setMessage(errorMessage)
        setMessageIsError(true)
      } else if (!data.user?.email) {
        setMessage('The account has no email address.')
        setMessageIsError(true)
      }
    } catch {
      setMessage('Could not reach Supabase. Check your connection and try again.')
      setMessageIsError(true)
    } finally {
      setLoading(false)
    }
  }

  async function handleSignUp(event) {
    event.preventDefault()
    setMessage('')
    setMessageIsError(false)

    const normalizedEmail = email.trim().toLowerCase()
    if (!STUDENT_EMAIL_PATTERN.test(normalizedEmail)) {
      setMessage('Use your university student email ending in .student@ua.edu.ph.')
      setMessageIsError(true)
      return
    }
    if (password !== confirmPassword) {
      setMessage('The passwords do not match.')
      setMessageIsError(true)
      return
    }

    setLoading(true)
    try {
      const { data, error } = await supabase.auth.signUp({
        email: normalizedEmail,
        password,
        options: { emailRedirectTo: window.location.origin }
      })
      if (error) {
        const errorMessage = error.message.toLowerCase().includes('already registered')
          ? 'An account already exists for this email. Sign in or resend its confirmation email.'
          : error.message
        setMessage(errorMessage)
        setMessageIsError(true)
      } else if (data.session) {
        setMessage('Your account was created. You are signed in.')
        setMessageIsError(false)
      } else {
        setMessage('Account created. Check your inbox or spam folder for the confirmation link, then sign in.')
        setMessageIsError(false)
      }
    } catch {
      setMessage('Could not reach Supabase. Check your connection and try again.')
      setMessageIsError(true)
    } finally {
      setLoading(false)
    }
  }

  async function handleResendConfirmation() {
    const normalizedEmail = email.trim().toLowerCase()
    if (!normalizedEmail) {
      setMessage('Enter your email address first.')
      setMessageIsError(true)
      return
    }

    setResending(true)
    setMessage('')
    setMessageIsError(false)
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: normalizedEmail,
        options: { emailRedirectTo: window.location.origin }
      })
      setMessage(error ? error.message : 'A new confirmation email was sent. Check your inbox or spam folder.')
      setMessageIsError(Boolean(error))
    } catch {
      setMessage('Could not reach Supabase. Check your connection and try again.')
      setMessageIsError(true)
    } finally {
      setResending(false)
    }
  }

  const isSignUp = mode === 'signup'
  const busy = loading || resending

  return (
    <main className={`login-page${isSignUp ? ' login-page--signup' : ''}`}>
      <section className="login-hero" aria-hidden="true">
        <div className="login__hero-text">
          <p className="login-hero-kicker">ICpEP.UA CHAPTER</p>
          <h2 className="login__hero-title">
            {isSignUp ? <>YOUR JOURNEY<br />STARTS HERE.</> : <>SIGN IN TO BE ONE.<br />Secure Your Spot!</>}
          </h2>
          <p className="login__hero-sub">
            {isSignUp
              ? 'Create your student account to join the attendance portal and stay connected with your chapter.'
              : 'Where the innovators of tomorrow meet today. Sign in to access your account, events, and attendance QR.'}
          </p>
        </div>
      </section>

      <section className="login-form-panel">
        <div className="card login-card">
          <p className="login-kicker">SECURE ATTENDANCE PORTAL</p>
          <h1>{isSignUp ? 'Create your account' : 'Welcome back'}</h1>
          <p className="login-intro">
            {isSignUp
              ? 'Register with your university student email.'
              : 'Sign in with your existing account to continue.'}
          </p>

          <form onSubmit={isSignUp ? handleSignUp : handleLogin}>
            <label htmlFor="login-email">Email address</label>
            <input
              id="login-email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              type="email"
              placeholder={isSignUp ? 'name.student@ua.edu.ph' : 'you@example.com'}
              autoComplete="email"
              required
            />

            <label htmlFor="login-password">{isSignUp ? 'Create password' : 'Password'}</label>
            <div className="login-password-field">
              <input
                id="login-password"
                className="login-password-input"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                type={showPassword ? 'text' : 'password'}
                placeholder={isSignUp ? 'Create a password' : 'Enter your password'}
                autoComplete={isSignUp ? 'new-password' : 'current-password'}
                required
              />
              <button
                className="login-password-toggle"
                type="button"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                aria-pressed={showPassword}
                onClick={() => setShowPassword((visible) => !visible)}
              >
                <svg aria-hidden="true" viewBox="0 0 24 24">
                  <path d="M2.1 12s3.6-7 9.9-7 9.9 7 9.9 7-3.6 7-9.9 7-9.9-7-9.9-7Z" />
                  <circle cx="12" cy="12" r="3" />
                  {showPassword && <path d="m3 3 18 18" />}
                </svg>
              </button>
            </div>

            {isSignUp && (
              <>
                <label htmlFor="confirm-password">Confirm password</label>
                <input
                  id="confirm-password"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter your password again"
                  autoComplete="new-password"
                  required
                />
              </>
            )}

            <button className="login-submit" disabled={busy} type="submit">
              {loading ? (isSignUp ? 'Signing in...' : 'Logging in...') : (isSignUp ? 'Sign up' : 'Log in')}
            </button>
          </form>

          {message && (
            <p className={`login-message${messageIsError ? ' error' : ' success'}`} role={messageIsError ? 'alert' : 'status'}>
              {message}
            </p>
          )}

          <div className="login-switch-row">
            {isSignUp ? (
              <>
                <span>Already have an account?</span>
                <button className="login-link" type="button" onClick={() => changeMode('login')}>Log In</button>
              </>
            ) : (
              <>
                <span>New to the portal?</span>
                <button className="login-link" type="button" onClick={() => changeMode('signup')}>Create a student account</button>
              </>
            )}
          </div>

          {isSignUp && (
            <button className="login-confirmation-resend" disabled={busy} onClick={handleResendConfirmation} type="button">
              {resending ? 'Sending...' : 'Resend confirmation email'}
            </button>
          )}
        </div>
      </section>
    </main>
  )
}
