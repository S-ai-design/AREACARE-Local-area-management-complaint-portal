import { useEffect, useState } from 'react'
import './admin_login.css'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { toast } from 'react-toastify'
import { apiFetch, ensureCsrfCookie } from '../auth/api'
import { useLoginLockout } from '../auth/useLoginLockout'

function AdminLogin() {
  const navigate = useNavigate()
  const location = useLocation()

  const [username, setUsername] = useState(() => localStorage.getItem('areacare_admin_username') || '')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(() => localStorage.getItem('areacare_admin_remember') === 'true')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const { isLocked, formattedTime, handleAuthResponse, clearLockout } = useLoginLockout({
    storageKey: 'areacare_admin_lockout_until',
    targetRole: 'admin',
    defaultRedirect: '/admin/dashboard',
  })

  useEffect(() => {
    // Prefetch CSRF cookie asynchronously on page load for instantaneous submit
    ensureCsrfCookie()
  }, [])

  function handleQuickFillDemo(which = 'shlok') {
    if (which === 'admin') {
      setUsername('admin')
      setPassword('admin123')
    } else {
      setUsername('Shlok@123')
      setPassword('Shlok@098')
    }
  }

  async function handleSubmit(event) {
    event.preventDefault()
    if (isSubmitting || isLocked) return

    const trimmedUsername = username.trim()
    if (!trimmedUsername || !password) {
      toast.error('Username and password are required.')
      return
    }

    setIsSubmitting(true)

    try {
      await ensureCsrfCookie()
      const response = await apiFetch('/api/admin-login/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: trimmedUsername, password }),
      })
      const result = await response.json()
      const wasErrorHandled = handleAuthResponse(response, result, 'Invalid superuser credentials.')
      if (wasErrorHandled) {
        return
      }

      clearLockout()

      if (rememberMe) {
        localStorage.setItem('areacare_admin_username', trimmedUsername)
        localStorage.setItem('areacare_admin_remember', 'true')
      } else {
        localStorage.removeItem('areacare_admin_username')
        localStorage.removeItem('areacare_admin_remember')
      }

      toast.success(result.message || 'Admin login successful.')
      const redirectPath = result.redirect || location.state?.from || (result.role === 'staff' ? '/staff/dashboard' : '/admin/dashboard')
      navigate(redirectPath, { replace: true })
    } catch {
      toast.error('Unable to connect to the admin server.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main className="admin-login-page">
      <section className="admin-login-card" aria-labelledby="admin-login-title">
        <header className="admin-login-header">
          <div className="portal-heading">
            <span className="portal-icon" aria-hidden="true">
              <i className="fa-solid fa-shield-halved" />
            </span>
            <div>
              <h1 id="admin-login-title">Municipal Admin Portal</h1>
              <p>Restricted Govt Personnel Access</p>
            </div>
          </div>

          <nav className="portal-tabs" aria-label="Admin portal actions">
            <Link className="portal-tab portal-tab-active" to="/adminlogin">
              Admin Login
            </Link>
            <Link className="portal-tab" to="/register-staff">
              Register Field Staff
            </Link>
          </nav>
        </header>

        <div className="admin-login-divider" />

        <div className="login-copy">
          <h2>Secure Administrator Authentication</h2>
          <p>
            Log in to access executive complaint management, department capacity planning &amp; SLA enforcement.
          </p>
        </div>

        {isLocked && (
          <div className="login-lockout-banner" role="alert">
            <div className="lockout-banner-icon">
              <i className="fa-solid fa-shield-virus" aria-hidden="true" />
            </div>
            <div className="lockout-banner-content">
              <strong>Account Temporarily Locked</strong>
              <p>Too many failed attempts detected. Login is suspended for security. Please try again in <span className="lockout-timer">{formattedTime}</span>.</p>
            </div>
          </div>
        )}

        <form className="admin-login-form" onSubmit={handleSubmit}>
          <label htmlFor="admin-username">Official Govt Email / Username <span>*</span></label>
          <input
            id="admin-username"
            name="username"
            type="text"
            placeholder="admin@smartcity.gov or admin"
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            autoComplete="username"
            autoFocus
            disabled={isSubmitting || isLocked}
            required
          />

          <label htmlFor="admin-password">Password <span>*</span></label>
          <div className="password-input-wrapper">
            <input
              id="admin-password"
              name="password"
              type={showPassword ? 'text' : 'password'}
              placeholder="**********"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="current-password"
              disabled={isSubmitting || isLocked}
              required
            />
            <button
              type="button"
              className="toggle-password-button"
              onClick={() => setShowPassword((prev) => !prev)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              title={showPassword ? 'Hide password' : 'Show password'}
              tabIndex="-1"
              disabled={isLocked}
            >
              <i className={`fa-solid ${showPassword ? 'fa-eye-slash' : 'fa-eye'}`} aria-hidden="true" />
            </button>
          </div>

          <div className="form-secondary-actions">
            <label className="remember-me-label">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(event) => setRememberMe(event.target.checked)}
                disabled={isSubmitting || isLocked}
              />
              <span>Remember username</span>
            </label>

            <div className="d-flex gap-2">
              <button
                type="button"
                className="quick-demo-badge"
                onClick={() => handleQuickFillDemo('shlok')}
                disabled={isSubmitting || isLocked}
                title="Click to auto-fill Shlok@123 credentials"
              >
                <i className="fa-solid fa-wand-magic-sparkles" aria-hidden="true" /> Demo 1 (Shlok)
              </button>
              <button
                type="button"
                className="quick-demo-badge"
                onClick={() => handleQuickFillDemo('admin')}
                disabled={isSubmitting || isLocked}
                title="Click to auto-fill admin credentials"
              >
                <i className="fa-solid fa-user-shield" aria-hidden="true" /> Demo 2 (admin)
              </button>
            </div>
          </div>

          <div className="login-actions">
            <p className="demo-account">
              Admin 1: <strong>Shlok@123</strong> / <strong>Shlok@098</strong> &nbsp;|&nbsp; Admin 2: <strong>admin</strong> / <strong>admin123</strong>
            </p>
            <button type="submit" className={`authorize-button ${isLocked ? 'authorize-button-locked' : ''}`} disabled={isSubmitting || isLocked}>
              {isLocked ? (
                <>
                  <i className="fa-solid fa-lock" aria-hidden="true" />
                  <span>Locked ({formattedTime})</span>
                </>
              ) : isSubmitting ? (
                <>
                  <i className="fa-solid fa-spinner fa-spin" aria-hidden="true" />
                  <span>Authorizing...</span>
                </>
              ) : (
                <>
                  <i className="fa-solid fa-shield-halved" aria-hidden="true" />
                  <span>Authorize Admin Portal</span>
                </>
              )}
            </button>
          </div>
        </form>
      </section>
    </main>
  )
}

export default AdminLogin
