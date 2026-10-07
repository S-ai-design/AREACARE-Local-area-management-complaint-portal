import { useEffect, useState } from 'react'
import './CitizenLogin.css'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { toast } from 'react-toastify'
import { apiFetch, ensureCsrfCookie } from '../auth/api'
import { useLoginLockout } from '../auth/useLoginLockout'

function CitizenLogin() {
  const navigate = useNavigate()
  const location = useLocation()

  const [email, setEmail] = useState(() => localStorage.getItem('areacare_citizen_email') || '')
  const [password, setPassword] = useState('')
  const [rememberMe, setRememberMe] = useState(() => localStorage.getItem('areacare_citizen_remember') === 'true')
  const [isLoading, setIsLoading] = useState(false)

  const { isLocked, formattedTime, handleAuthResponse, clearLockout } = useLoginLockout({
    storageKey: 'areacare_citizen_lockout_until',
    targetRole: 'citizen',
    defaultRedirect: '/citizen/track',
  })

  useEffect(() => {
    // Prefetch CSRF cookie asynchronously for fast subsequent submission
    ensureCsrfCookie()
  }, [])

  function handleQuickFillDemo() {
    setEmail('citizen@example.com')
    setPassword('Citizen@123')
  }

  async function handleSubmit(event) {
    event.preventDefault()
    if (isLoading || isLocked) return

    const trimmedEmail = email.trim()

    if (!trimmedEmail || !password) {
      toast.error('Email and password are required.')
      return
    }

    setIsLoading(true)
    try {
      await ensureCsrfCookie()
      const response = await apiFetch('/api/citizen-login/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: trimmedEmail, password }),
      })
      const result = await response.json()
      const wasErrorHandled = handleAuthResponse(response, result, 'No citizen account matches these details.')
      if (wasErrorHandled) {
        return
      }

      clearLockout()

      if (rememberMe) {
        localStorage.setItem('areacare_citizen_email', trimmedEmail)
        localStorage.setItem('areacare_citizen_remember', 'true')
      } else {
        localStorage.removeItem('areacare_citizen_email')
        localStorage.removeItem('areacare_citizen_remember')
      }

      toast.success(result.message || 'Citizen login successful.')
      const redirectPath = location.state?.from || '/citizen/track'
      const redirectState = location.state?.complaintId
        ? { complaintId: location.state.complaintId }
        : undefined
      navigate(redirectPath, { replace: true, state: redirectState })
    } catch {
      toast.error('Unable to connect to the citizen server.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <main className="citizen-login-page">
      <section className="citizen-login-card" aria-labelledby="citizen-login-title">
        <div className="citizen-login-icon">
          <i className="fa-solid fa-user-check" aria-hidden="true" />
        </div>
        <p className="citizen-login-label">AreaCare citizen access</p>
        <h1 id="citizen-login-title">Welcome back</h1>
        <p className="citizen-login-intro">
          Sign in with the email and password used for your complaint to securely track its progress.
        </p>

        {isLocked && (
          <div className="citizen-lockout-banner" role="alert">
            <div className="citizen-lockout-icon">
              <i className="fa-solid fa-shield-virus" aria-hidden="true" />
            </div>
            <div className="citizen-lockout-content">
              <strong>Account Access Suspended</strong>
              <p>Too many failed sign-in attempts. Please try again in <span className="citizen-lockout-timer">{formattedTime}</span>.</p>
            </div>
          </div>
        )}

        <form className="citizen-login-form" onSubmit={handleSubmit}>
          <label htmlFor="citizen-login-email">Email address</label>
          <input
            id="citizen-login-email"
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            autoComplete="email"
            autoFocus
            disabled={isLoading || isLocked}
            required
          />

          <label htmlFor="citizen-login-password">Password</label>
          <input
            id="citizen-login-password"
            type="password"
            placeholder="Enter your password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete="current-password"
            disabled={isLoading || isLocked}
            required
          />

          <div className="citizen-secondary-actions">
            <label className="citizen-remember-label">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(event) => setRememberMe(event.target.checked)}
                disabled={isLoading || isLocked}
              />
              <span>Remember details</span>
            </label>

            <button
              type="button"
              className="citizen-quick-demo-badge"
              onClick={handleQuickFillDemo}
              disabled={isLoading || isLocked}
              title="Click to fill demo citizen credentials"
            >
              <i className="fa-solid fa-wand-magic-sparkles" aria-hidden="true" /> Demo citizen
            </button>
          </div>

          <button type="submit" disabled={isLoading || isLocked} className={`citizen-submit-btn ${isLocked ? 'citizen-submit-btn-locked' : ''}`}>
            {isLocked ? (
              <>
                <i className="fa-solid fa-lock" aria-hidden="true" />
                <span>Locked ({formattedTime})</span>
              </>
            ) : isLoading ? (
              <>
                <i className="fa-solid fa-spinner fa-spin" aria-hidden="true" />
                <span>Signing in...</span>
              </>
            ) : (
              <>
                <i className="fa-solid fa-arrow-right-to-bracket" aria-hidden="true" />
                <span>Continue to tracking</span>
              </>
            )}
          </button>
        </form>

        <p className="citizen-login-note">
          New complaint? <Link to="/citizen/complaint">Submit one here</Link>
        </p>
      </section>
    </main>
  )
}

export default CitizenLogin
