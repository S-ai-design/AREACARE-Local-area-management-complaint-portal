import { useState } from 'react'
import './CitizenLogin.css'
import { Link, useNavigate } from 'react-router-dom'
import { toast } from 'react-toastify'
import { API_BASE_URL } from '../auth/api'

function CitizenLogin() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  async function handleSubmit(event) {
    event.preventDefault()
    setIsLoading(true)
    try {
      const response = await fetch(`${API_BASE_URL}/api/citizen-login/`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
        body: JSON.stringify({ email, phone }),
      })
      const result = await response.json()
      if (!response.ok) {
        toast.error(result.error || 'Citizen login failed.')
        return
      }
      toast.success(result.message)
      navigate('/citizen/track')
    } catch {
      toast.error('Unable to connect to the citizen server.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <main className="citizen-login-page">
      <section className="citizen-login-card" aria-labelledby="citizen-login-title">
        <div className="citizen-login-icon"><i className="fa-solid fa-user-check" aria-hidden="true" /></div>
        <p className="citizen-login-label">AreaCare citizen access</p>
        <h1 id="citizen-login-title">Welcome back</h1>
        <p className="citizen-login-intro">Sign in with the contact details used for your complaint to securely track its progress.</p>
        <form className="citizen-login-form" onSubmit={handleSubmit}>
          <label htmlFor="citizen-login-email">Email address</label>
          <input id="citizen-login-email" type="email" placeholder="you@example.com" value={email} onChange={(event) => setEmail(event.target.value)} required />
          <label htmlFor="citizen-login-phone">Phone number</label>
          <input id="citizen-login-phone" type="tel" placeholder="+91 98765 43210" value={phone} onChange={(event) => setPhone(event.target.value)} required />
          <button type="submit" disabled={isLoading}><i className="fa-solid fa-arrow-right-to-bracket" aria-hidden="true" /> {isLoading ? 'Signing in...' : 'Continue to tracking'}</button>
        </form>
        <p className="citizen-login-note">New complaint? <Link to="/citizen/complaint">Submit one here</Link></p>
      </section>
    </main>
  )
}

export default CitizenLogin
