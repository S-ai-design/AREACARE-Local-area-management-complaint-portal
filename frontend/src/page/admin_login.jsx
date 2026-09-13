import { useState } from 'react'
import './admin_login.css'
import { useNavigate } from 'react-router-dom'
import { toast } from 'react-toastify'
import { apiFetch, ensureCsrfCookie } from '../auth/api'

function AdminLogin() {

  const navigate = useNavigate()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleSubmit(event) {
    event.preventDefault()
    setIsSubmitting(true)

    try {
      await ensureCsrfCookie()
      const response = await apiFetch('/api/admin-login/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      })
      const result = await response.json()
      if (!response.ok) {
        toast.error(result.error || 'Invalid superuser credentials.')
        return
      }

      toast.success(result.message || 'Admin login successful.')
        navigate('/admin/dashboard')
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
            <a className="portal-tab portal-tab-active" href="/adminlogin">
              Admin Login
            </a>
            <a className="portal-tab" href="/register-officer">
              Register Municipal Officer
            </a>
          </nav>
        </header>

        <div className="admin-login-divider" />

        <div className="login-copy">
          <h2>Secure Administrator Authentication</h2>
          <p>
            Log in to access executive complaint management, department capacity planning &amp; SLA enforcement.
          </p>
        </div>

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
            required
          />

          <label htmlFor="admin-password">Password <span>*</span></label>
          <input
            id="admin-password"
            name="password"
            type="password"
            placeholder="**********"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete="current-password"
            required
          />

          <div className="login-actions">
            <p className="demo-account">Demo Admin: admin@smartcity.gov / admin123</p>
            <button type="submit" className="authorize-button" disabled={isSubmitting}>
              <i className="fa-solid fa-shield-halved" aria-hidden="true" />
              {isSubmitting ? 'Authorizing...' : 'Authorize Admin Portal'}
            </button>
          </div>
        </form>
      </section>
    </main>
  )
}

export default AdminLogin
