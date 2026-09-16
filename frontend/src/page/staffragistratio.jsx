import { useEffect, useState } from 'react'
import './staffregistration.css'
import { Link, useNavigate } from 'react-router-dom'
import { toast } from 'react-toastify'
import { apiFetch, ensureCsrfCookie } from '../auth/api'

function StaffRegistration() {
  const navigate = useNavigate()
  const [formData, setFormData] = useState({
    fullName: '',
    username: '',
    email: '',
    phone: '',
    department: '',
    password: '',
    confirmPassword: '',
  })
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    // Prefetch CSRF cookie so registration request is not blocked
    ensureCsrfCookie()
  }, [])

  function handleChange(event) {
    const { name, value } = event.target
    setFormData((currentData) => ({ ...currentData, [name]: value }))
  }

  function handleQuickFillDemo() {
    const randomSuffix = Math.floor(1000 + Math.random() * 9000)
    setFormData({
      fullName: 'Field Inspector Officer',
      username: `officer_${randomSuffix}`,
      email: `officer${randomSuffix}@smartcity.gov`,
      phone: `98765${randomSuffix}`,
      department: 'roads',
      password: 'StaffPassword123!',
      confirmPassword: 'StaffPassword123!',
    })
    toast.info('Filled sample staff details. Click Create Staff Account to submit.')
  }

  async function handleSubmit(event) {
    event.preventDefault()
    if (isSubmitting) return

    const trimmedFullName = formData.fullName.trim()
    const trimmedUsername = formData.username.trim()
    const trimmedEmail = formData.email.trim()
    const cleanPhone = formData.phone.replace(/\D/g, '')

    if (!trimmedFullName || !trimmedUsername || !trimmedEmail || !cleanPhone || !formData.department || !formData.password) {
      toast.error('All required registration fields must be filled.')
      return
    }

    if (formData.password !== formData.confirmPassword) {
      toast.error('Passwords do not match.')
      return
    }

    if (formData.password.length < 6) {
      toast.error('Password should be at least 6 characters.')
      return
    }

    setIsSubmitting(true)
    try {
      await ensureCsrfCookie()

      const payload = {
        fullName: trimmedFullName,
        username: trimmedUsername,
        email: trimmedEmail,
        phone: cleanPhone,
        department: formData.department,
        password: formData.password,
      }

      const response = await apiFetch('/api/staff-register/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const result = await response.json()
      if (!response.ok) {
        toast.error(result.error || 'Registration failed.')
        return
      }

      toast.success(result.message || 'Staff account created successfully! Redirecting to login...')
      localStorage.setItem('areacare_staff_username', trimmedUsername)
      localStorage.setItem('areacare_staff_remember', 'true')

      setTimeout(() => {
        navigate('/stafflogin')
      }, 1200)
    } catch (error) {
      toast.error(
        error instanceof TypeError
          ? 'Unable to connect to the staff server. Please check if the backend is running.'
          : 'Staff registration failed. Please try again.'
      )
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
          <div className="registration-header-row">
            <div>
              <h2>Register Field Staff</h2>
              <p>Create an account for municipal field operations and assigned task execution.</p>
            </div>
            <button
              type="button"
              className="quick-demo-badge"
              onClick={handleQuickFillDemo}
              disabled={isSubmitting}
              title="Auto-fill sample registration data"
            >
              <i className="fa-solid fa-wand-magic-sparkles" aria-hidden="true" /> Fill Demo Details
            </button>
          </div>
        </div>

        <form className="staff-registration-form" onSubmit={handleSubmit}>
          <div className="registration-field">
            <label htmlFor="staff-full-name">Full Name <span>*</span></label>
            <input
              id="staff-full-name"
              name="fullName"
              type="text"
              placeholder="Enter full name"
              value={formData.fullName}
              onChange={handleChange}
              autoFocus
              disabled={isSubmitting}
              required
            />
          </div>

          <div className="registration-field">
            <label htmlFor="staff-username">Staff Username <span>*</span></label>
            <input
              id="staff-username"
              name="username"
              type="text"
              placeholder="staff.roads"
              value={formData.username}
              onChange={handleChange}
              disabled={isSubmitting}
              required
            />
          </div>

          <div className="registration-field">
            <label htmlFor="staff-email">Official Email <span>*</span></label>
            <input
              id="staff-email"
              name="email"
              type="email"
              placeholder="staff@smartcity.gov"
              value={formData.email}
              onChange={handleChange}
              disabled={isSubmitting}
              required
            />
          </div>

          <div className="registration-field">
            <label htmlFor="staff-phone">Phone Number <span>*</span></label>
            <input
              id="staff-phone"
              name="phone"
              type="tel"
              placeholder="+91 98765 43210"
              value={formData.phone}
              onChange={handleChange}
              disabled={isSubmitting}
              required
            />
          </div>

          <div className="registration-field registration-field-wide">
            <label htmlFor="staff-department">Department <span>*</span></label>
            <select
              id="staff-department"
              name="department"
              value={formData.department}
              onChange={handleChange}
              disabled={isSubmitting}
              required
            >
              <option value="">Select department</option>
              <option value="roads">Roads &amp; Transport</option>
              <option value="water">Water &amp; Sanitation</option>
              <option value="electricity">Electricity</option>
              <option value="waste">Waste Management</option>
              <option value="parks">Parks &amp; Public Spaces</option>
            </select>
          </div>

          <div className="registration-field">
            <label htmlFor="staff-password">Password <span>*</span></label>
            <div className="reg-password-wrapper">
              <input
                id="staff-password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                placeholder="Create a password"
                value={formData.password}
                onChange={handleChange}
                autoComplete="new-password"
                disabled={isSubmitting}
                required
              />
              <button
                type="button"
                className="toggle-reg-password-button"
                onClick={() => setShowPassword((prev) => !prev)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                title={showPassword ? 'Hide password' : 'Show password'}
                tabIndex="-1"
              >
                <i className={`fa-solid ${showPassword ? 'fa-eye-slash' : 'fa-eye'}`} aria-hidden="true" />
              </button>
            </div>
          </div>

          <div className="registration-field">
            <label htmlFor="staff-confirm-password">Confirm Password <span>*</span></label>
            <div className="reg-password-wrapper">
              <input
                id="staff-confirm-password"
                name="confirmPassword"
                type={showConfirmPassword ? 'text' : 'password'}
                placeholder="Repeat your password"
                value={formData.confirmPassword}
                onChange={handleChange}
                autoComplete="new-password"
                disabled={isSubmitting}
                required
              />
              <button
                type="button"
                className="toggle-reg-password-button"
                onClick={() => setShowConfirmPassword((prev) => !prev)}
                aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
                title={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
                tabIndex="-1"
              >
                <i className={`fa-solid ${showConfirmPassword ? 'fa-eye-slash' : 'fa-eye'}`} aria-hidden="true" />
              </button>
            </div>
          </div>

          <div className="registration-actions">
            <Link className="registration-back-link" to="/stafflogin">Already registered? Staff Login</Link>
            <button type="submit" className="open-console-button" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <i className="fa-solid fa-spinner fa-spin" aria-hidden="true" />
                  <span>Creating account...</span>
                </>
              ) : (
                <>
                  <i className="fa-solid fa-user-plus" aria-hidden="true" />
                  <span>Create Staff Account</span>
                </>
              )}
            </button>
          </div>
        </form>
      </section>
    </main>
  )
}

export default StaffRegistration
