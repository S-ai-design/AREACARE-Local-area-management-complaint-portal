import { useState } from 'react'
import './staffregistration.css'
import { Link } from 'react-router-dom'
import { toast } from 'react-toastify'

function StaffRegistration() {
  const [formData, setFormData] = useState({
    fullName: '',
    username: '',
    email: '',
    phone: '',
    department: '',
    password: '',
    confirmPassword: '',
  })
  const [isSubmitting, setIsSubmitting] = useState(false)

  function handleChange(event) {
    const { name, value } = event.target
    setFormData((currentData) => ({ ...currentData, [name]: value }))
  }

  async function handleSubmit(event) {
    event.preventDefault()

    if (formData.password !== formData.confirmPassword) {
      toast.error('Passwords do not match.')
      return
    }

    setIsSubmitting(true)
    try {
      const response = await fetch('http://127.0.0.1:8000/api/staff-register/', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(formData) })
      const result = await response.json()
      if (!response.ok) {
        toast.error(result.error || 'Registration failed.')
        return
      }
      toast.success(result.message)
    } catch {
      toast.error('Unable to connect to the staff server.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main className="staff-registration-page">
      <section className="staff-registration-card" aria-labelledby="staff-registration-title">
        <header className="staff-registration-header">
          <div className="staff-portal-heading">
            <span className="staff-portal-icon" aria-hidden="true">
              <i className="fa-solid fa-suitcase" />
            </span>
            <div>
              <h1 id="staff-registration-title">Department Field Staff Portal</h1>
              <p>Municipal Field Operations &amp; Task Execution</p>
            </div>
          </div>

          <nav className="staff-portal-tabs" aria-label="Staff portal actions">
            <Link className="staff-portal-tab" to="/stafflogin">Staff Login</Link>
            <Link className="staff-portal-tab staff-portal-tab-active" to="/register-staff">
              Register Field Staff
            </Link>
          </nav>
        </header>

        <div className="staff-login-divider" />

        <div className="staff-registration-copy">
          <h2>Register Field Staff</h2>
          <p>Create an account for municipal field operations and assigned task execution.</p>
        </div>

        <form className="staff-registration-form" onSubmit={handleSubmit}>
          <div className="registration-field">
            <label htmlFor="staff-full-name">Full Name <span>*</span></label>
            <input id="staff-full-name" name="fullName" type="text" placeholder="Enter full name" value={formData.fullName} onChange={handleChange} required />
          </div>
          <div className="registration-field">
            <label htmlFor="staff-username">Staff Username <span>*</span></label>
            <input id="staff-username" name="username" type="text" placeholder="staff.roads" value={formData.username} onChange={handleChange} required />
          </div>
          <div className="registration-field">
            <label htmlFor="staff-email">Official Email <span>*</span></label>
            <input id="staff-email" name="email" type="email" placeholder="staff@smartcity.gov" value={formData.email} onChange={handleChange} required />
          </div>
          <div className="registration-field">
            <label htmlFor="staff-phone">Phone Number <span>*</span></label>
            <input id="staff-phone" name="phone" type="tel" placeholder="Enter phone number" value={formData.phone} onChange={handleChange} required />
          </div>
          <div className="registration-field registration-field-wide">
            <label htmlFor="staff-department">Department <span>*</span></label>
            <select id="staff-department" name="department" value={formData.department} onChange={handleChange} required>
              <option value="">Select department</option>
              <option value="roads">Roads &amp; Transport</option>
              <option value="water">Water &amp; Sanitation</option>
              <option value="electricity">Electricity</option>
              <option value="waste">Waste Management</option>
            </select>
          </div>
          <div className="registration-field">
            <label htmlFor="staff-password">Password <span>*</span></label>
            <input id="staff-password" name="password" type="password" placeholder="Create a password" value={formData.password} onChange={handleChange} autoComplete="new-password" required />
          </div>
          <div className="registration-field">
            <label htmlFor="staff-confirm-password">Confirm Password <span>*</span></label>
            <input id="staff-confirm-password" name="confirmPassword" type="password" placeholder="Repeat your password" value={formData.confirmPassword} onChange={handleChange} autoComplete="new-password" required />
          </div>

          <div className="registration-actions">
            <Link className="registration-back-link" to="/stafflogin">Already registered? Staff Login</Link>
            <button type="submit" className="open-console-button" disabled={isSubmitting}>
              <i className="fa-solid fa-user-plus" aria-hidden="true" />
              {isSubmitting ? 'Creating account...' : 'Create Staff Account'}
            </button>
          </div>
        </form>
      </section>
    </main>
  )
}

export default StaffRegistration
