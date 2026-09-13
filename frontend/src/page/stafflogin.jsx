import { useState } from 'react'
import './stafflogin.css'
import { Link, useNavigate } from 'react-router-dom'
import { toast } from 'react-toastify'
import { apiFetch, ensureCsrfCookie } from '../auth/api'

function StaffLogin() {
  const navigate = useNavigate()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleSubmit(event) {
    event.preventDefault()
    const trimmedUsername = username.trim()
    if (!trimmedUsername || !password) {
      toast.error('Username/email and password are required.')
      return
    }

    setIsSubmitting(true)
    try {
      await ensureCsrfCookie()
      const response = await apiFetch('/api/staff-login/', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username: trimmedUsername, password }) })
      const result = await response.json()
      if (!response.ok) {
        toast.error(result.error || 'Invalid staff credentials.')
        return
      }
      toast.success(result.message)
      navigate('/staff/dashboard', { replace: true })
    } catch (error) {
      toast.error(error instanceof TypeError ? 'Unable to connect to the staff server.' : 'Staff login failed. Please try again.')
    } finally {
      setIsSubmitting(false)
    }

  }

  return (
    <main className="staff-login-page">
      <section className="staff-login-card" aria-labelledby="staff-login-title">
        <header className="staff-login-header">
          <div className="staff-portal-heading">
            <span className="staff-portal-icon" aria-hidden="true">
              <i className="fa-solid fa-suitcase" />
            </span>
            <div>
              <h1 id="staff-login-title">Department Field Staff Portal</h1>
              <p>Municipal Field Operations &amp; Task Execution</p>
            </div>
          </div>

          <nav className="staff-portal-tabs" aria-label="Staff portal actions">
            <Link className="staff-portal-tab staff-portal-tab-active" to="/stafflogin">
              Staff Login
            </Link>
            <Link className="staff-portal-tab" to="/register-staff">
              Register Field Staff
            </Link>
          </nav>
        </header>

        <div className="staff-login-divider" />

        <div className="staff-login-copy">
          <h2>Field Officer Login</h2>
          <p>Log in to access your assigned work queue, update progress, and upload resolution proof.</p>
        </div>

        <form className="staff-login-form" onSubmit={handleSubmit}>
          <label htmlFor="staff-username">Staff Username or Email <span>*</span></label>
          <input
            id="staff-username"
            name="username"
            type="text"
            placeholder="staff.roads@smartcity.gov"
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            autoComplete="username"
            required
          />

          <label htmlFor="staff-password">Password <span>*</span></label>
          <input
            id="staff-password"
            name="password"
            type="password"
            placeholder="Enter your password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete="current-password"
            required
          />

          <div className="staff-login-actions">
            <p className="staff-demo-account">Use your registered staff username or email.</p>
            <button type="submit" className="open-console-button" disabled={isSubmitting}>
              <i className="fa-solid fa-right-to-bracket" aria-hidden="true" />
              {isSubmitting ? 'Signing in...' : 'Open Staff Work Console'}
            </button>
          </div>
        </form>
      </section>
    </main>
  )
}

export default StaffLogin
