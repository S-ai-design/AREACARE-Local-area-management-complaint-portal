import { useEffect, useState } from 'react'
import './CitizenLogin.css'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { toast } from 'react-toastify'
import { apiFetch, ensureCsrfCookie } from '../auth/api'

function CitizenLogin() {
  const navigate = useNavigate()
  const location = useLocation()

  const [email, setEmail] = useState(() => localStorage.getItem('areacare_citizen_email') || '')
  const [phone, setPhone] = useState(() => localStorage.getItem('areacare_citizen_phone') || '')
  const [rememberMe, setRememberMe] = useState(() => localStorage.getItem('areacare_citizen_remember') === 'true')
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    // Prefetch CSRF cookie asynchronously for fast subsequent submission
    ensureCsrfCookie()
  }, [])

  function handleQuickFillDemo() {
    setEmail('citizen@example.com')
    setPhone('9876543210')
  }

  async function handleSubmit(event) {
    event.preventDefault()
    if (isLoading) return

    const trimmedEmail = email.trim()
    const cleanPhone = phone.replace(/\D/g, '')

    if (!trimmedEmail || !cleanPhone) {
      toast.error('Email and a valid phone number are required.')
      return
    }

    setIsLoading(true)
    try {
      await ensureCsrfCookie()
      const response = await apiFetch('/api/citizen-login/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: trimmedEmail, phone: cleanPhone }),
      })
      const result = await response.json()
      if (!response.ok) {
        toast.error(result.error || 'Citizen login failed.')
        return
      }

      if (rememberMe) {
        localStorage.setItem('areacare_citizen_email', trimmedEmail)
        localStorage.setItem('areacare_citizen_phone', cleanPhone)
        localStorage.setItem('areacare_citizen_remember', 'true')
      } else {
        localStorage.removeItem('areacare_citizen_email')
        localStorage.removeItem('areacare_citizen_phone')
        localStorage.removeItem('areacare_citizen_remember')
      }

      toast.success(result.message || 'Citizen login successful.')
      const redirectPath = location.state?.from || '/citizen/track'
      navigate(redirectPath, { replace: true })
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
          Sign in with the contact details used for your complaint to securely track its progress.
        </p>

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
            disabled={isLoading}
            required
          />

          <label htmlFor="citizen-login-phone">Phone number</label>
          <input
            id="citizen-login-phone"
            type="tel"
            placeholder="+91 98765 43210"
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
            autoComplete="tel"
            disabled={isLoading}
            required
          />

          <div className="citizen-secondary-actions">
            <label className="citizen-remember-label">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(event) => setRememberMe(event.target.checked)}
                disabled={isLoading}
              />
              <span>Remember details</span>
            </label>

            <button
              type="button"
              className="citizen-quick-demo-badge"
              onClick={handleQuickFillDemo}
              disabled={isLoading}
              title="Click to fill demo citizen credentials"
            >
              <i className="fa-solid fa-wand-magic-sparkles" aria-hidden="true" /> Demo citizen
            </button>
          </div>

          <button type="submit" disabled={isLoading} className="citizen-submit-btn">
            {isLoading ? (
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
