import { useEffect, useState } from 'react'
import './stafflogin.css'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { toast } from 'react-toastify'
import { apiFetch, ensureCsrfCookie } from '../auth/api'

function StaffLogin() {
  const navigate = useNavigate()
  const location = useLocation()

  const [username, setUsername] = useState(() => localStorage.getItem('areacare_staff_username') || '')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(() => localStorage.getItem('areacare_staff_remember') === 'true')
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    // Prefetch CSRF cookie asynchronously for fast subsequent submission
    ensureCsrfCookie()
  }, [])

  function handleQuickFillDemo() {
    setUsername('roads-staff')
    setPassword('Staff-password-123')
  }

  async function handleSubmit(event) {
    event.preventDefault()
    if (isSubmitting) return

    const trimmedUsername = username.trim()
    if (!trimmedUsername || !password) {
      toast.error('Username/email and password are required.')
      return
    }

    setIsSubmitting(true)
    try {
      await ensureCsrfCookie()
      const response = await apiFetch('/api/staff-login/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: trimmedUsername, password }),
      })
      const result = await response.json()
      if (!response.ok) {
        toast.error(result.error || 'Invalid staff credentials.')
        return
      }

      if (rememberMe) {
        localStorage.setItem('areacare_staff_username', trimmedUsername)
        localStorage.setItem('areacare_staff_remember', 'true')
      } else {
        localStorage.removeItem('areacare_staff_username')
        localStorage.removeItem('areacare_staff_remember')
      }

      toast.success(result.message || 'Staff login successful.')
      const redirectPath = location.state?.from || '/staff/dashboard'
      navigate(redirectPath, { replace: true })
    } catch (error) {
      toast.error(
        error instanceof TypeError
          ? 'Unable to connect to the staff server.'
          : 'Staff login failed. Please try again.'
      )
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
            placeholder="staff.roads@smartcity.gov or roads-staff"
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            autoComplete="username"
            autoFocus
            disabled={isSubmitting}
            required
          />

          <label htmlFor="staff-password">Password <span>*</span></label>
          <div className="staff-password-wrapper">
            <input
              id="staff-password"
              name="password"
              type={showPassword ? 'text' : 'password'}
              placeholder="Enter your password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="current-password"
              disabled={isSubmitting}
              required
            />
            <button
              type="button"
              className="toggle-staff-password-button"
              onClick={() => setShowPassword((prev) => !prev)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              title={showPassword ? 'Hide password' : 'Show password'}
              tabIndex="-1"
            >
              <i className={`fa-solid ${showPassword ? 'fa-eye-slash' : 'fa-eye'}`} aria-hidden="true" />
            </button>
          </div>

          <div className="staff-secondary-actions">
            <label className="staff-remember-label">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(event) => setRememberMe(event.target.checked)}
                disabled={isSubmitting}
              />
              <span>Remember username</span>
            </label>

            <button
              type="button"
              className="staff-quick-demo-badge"
              onClick={handleQuickFillDemo}
              disabled={isSubmitting}
              title="Click to auto-fill demo staff credentials"
            >
              <i className="fa-solid fa-wand-magic-sparkles" aria-hidden="true" /> Fill Demo Staff
            </button>
          </div>

          <div className="staff-login-actions">
            <p className="staff-demo-account">
              Demo Staff: <strong>roads-staff</strong> / <strong>Staff-password-123</strong>
            </p>
            <button type="submit" className="open-console-button" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <i className="fa-solid fa-spinner fa-spin" aria-hidden="true" />
                  <span>Signing in...</span>
                </>
              ) : (
                <>
                  <i className="fa-solid fa-right-to-bracket" aria-hidden="true" />
                  <span>Open Staff Work Console</span>
                </>
              )}
            </button>
          </div>
        </form>
      </section>
    </main>
  )
}

export default StaffLogin
