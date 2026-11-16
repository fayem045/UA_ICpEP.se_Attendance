import React, { useEffect, useRef, useState } from 'react'
import userIcon from '../image/user.png'
import { supabase } from '../lib/supabaseClient'

export default function UserProfile({ profile }) {
  const [isOpen, setIsOpen] = useState(false)
  const [isSigningOut, setIsSigningOut] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const menuRef = useRef(null)

  useEffect(() => {
    function handlePointerDown(event) {
      if (!menuRef.current?.contains(event.target)) setIsOpen(false)
    }

    function handleKeyDown(event) {
      if (event.key === 'Escape') setIsOpen(false)
    }

    document.addEventListener('pointerdown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [])

  async function handleSignOut() {
    setIsSigningOut(true)
    setErrorMessage('')

    try {
      const { error } = await supabase.auth.signOut()
      if (error) setErrorMessage(`Unable to sign out: ${error.message}`)
    } catch (error) {
      setErrorMessage(`Unable to sign out: ${error.message}`)
    } finally {
      setIsSigningOut(false)
    }
  }

  const displayName = profile?.user_metadata?.full_name
    || profile?.user_metadata?.name
    || 'Admin'
  const email = profile?.email || 'Email unavailable'
  const createdAt = profile?.created_at
    ? new Date(profile.created_at).toLocaleDateString()
    : ''

  return (
    <div className="user-profile" ref={menuRef}>
      <button
        className="icon-btn user-profile-trigger"
        type="button"
        aria-label="Open admin profile"
        aria-expanded={isOpen}
        aria-controls="admin-profile-menu"
        onClick={() => {
          setErrorMessage('')
          setIsOpen((open) => !open)
        }}
      >
        <img src={userIcon} alt="" />
      </button>

      {isOpen && (
        <section id="admin-profile-menu" className="user-profile-menu" aria-label="Admin profile">
          <div className="user-profile-heading">
            <div className="user-profile-avatar" aria-hidden="true">
              {displayName.charAt(0).toUpperCase()}
            </div>
            <div className="user-profile-identity">
              <strong>{displayName}</strong>
              <span>{email}</span>
            </div>
          </div>

          <dl className="user-profile-details">
            <div>
              <dt>Role</dt>
              <dd>Administrator</dd>
            </div>
            {createdAt && (
              <div>
                <dt>Account created</dt>
                <dd>{createdAt}</dd>
              </div>
            )}
          </dl>

          {errorMessage && <p className="user-profile-error" role="alert">{errorMessage}</p>}
          <button
            className="user-profile-signout"
            type="button"
            onClick={handleSignOut}
            disabled={isSigningOut}
          >
            {isSigningOut ? 'Signing out...' : 'Log out'}
          </button>
        </section>
      )}
    </div>
  )
}
