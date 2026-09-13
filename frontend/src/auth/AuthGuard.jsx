import { useEffect, useState } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { API_BASE_URL } from './api'

function AuthGuard({ role, children }) {
  const location = useLocation()
  const [state, setState] = useState({ loading: true, authenticated: false, role: null })

  useEffect(() => {
    let cancelled = false
    fetch(`${API_BASE_URL}/api/auth/session/`, { credentials: 'include' })
      .then(async (response) => ({ response, result: await response.json() }))
      .then(({ response, result }) => {
        if (!cancelled) setState({ loading: false, authenticated: response.ok && result.authenticated === true, role: result.role || null })
      })
      .catch(() => { if (!cancelled) setState({ loading: false, authenticated: false, role: null }) })
    return () => { cancelled = true }
  }, [location.pathname])

  if (state.loading) return <main className="auth-loading">Checking your session...</main>
  if (!state.authenticated || state.role !== role) {
    const loginPath = role === 'admin' ? '/adminlogin' : role === 'staff' ? '/stafflogin' : '/citizen/login'
    return <Navigate to={loginPath} replace state={{ from: location.pathname }} />
  }
  return children
}

export default AuthGuard
