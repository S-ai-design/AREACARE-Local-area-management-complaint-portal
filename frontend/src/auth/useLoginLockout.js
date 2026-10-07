import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'react-toastify'
import { API_BASE_URL } from './api'

export function useLoginLockout({ storageKey, targetRole, defaultRedirect }) {
  const navigate = useNavigate()
  const [lockoutSeconds, setLockoutSeconds] = useState(() => {
    try {
      const stored = sessionStorage.getItem(storageKey)
      if (stored) {
        const remaining = Math.ceil((Number(stored) - Date.now()) / 1000)
        return remaining > 0 ? remaining : 0
      }
    } catch {
      // ignore storage errors
    }
    return 0
  })

  // Check if user is already logged in with this role; redirect away if so
  useEffect(() => {
    let cancelled = false
    fetch(`${API_BASE_URL}/api/auth/session/`, { credentials: 'include' })
      .then(async (res) => {
        if (!res.ok) return null
        return res.json()
      })
      .then((data) => {
        if (!cancelled && data?.authenticated && data.role === targetRole) {
          navigate(defaultRedirect, { replace: true })
        }
      })
      .catch(() => {})

    return () => {
      cancelled = true
    }
  }, [targetRole, defaultRedirect, navigate])

  // Countdown timer for lockout
  useEffect(() => {
    if (lockoutSeconds <= 0) {
      sessionStorage.removeItem(storageKey)
      return
    }

    const timer = setInterval(() => {
      setLockoutSeconds((prev) => {
        if (prev <= 1) {
          sessionStorage.removeItem(storageKey)
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [lockoutSeconds, storageKey])

  function formatTime(seconds) {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
  }

  function handleAuthResponse(response, result, defaultError = 'Authentication failed.') {
    if (response.status === 429 || result?.lockout) {
      const retryAfter = Number(result?.retry_after) || 300
      const lockUntil = Date.now() + retryAfter * 1000
      try {
        sessionStorage.setItem(storageKey, String(lockUntil))
      } catch {
        // ignore
      }
      setLockoutSeconds(retryAfter)
      toast.error(result?.error || `Too many failed attempts. Locked for ${Math.ceil(retryAfter / 60)} minutes.`)
      return true
    }

    if (!response.ok) {
      if (typeof result?.attempts_left === 'number') {
        toast.warning(result.error || `${defaultError} (${result.attempts_left} attempts remaining)`)
      } else {
        toast.error(result?.error || defaultError)
      }
      return true
    }

    // Success
    try {
      sessionStorage.removeItem(storageKey)
    } catch {
      // ignore
    }
    setLockoutSeconds(0)
    return false
  }

  return {
    lockoutSeconds,
    isLocked: lockoutSeconds > 0,
    formattedTime: formatTime(lockoutSeconds),
    handleAuthResponse,
    clearLockout: () => {
      try {
        sessionStorage.removeItem(storageKey)
      } catch {
        // ignore
      }
      setLockoutSeconds(0)
    },
  }
}
