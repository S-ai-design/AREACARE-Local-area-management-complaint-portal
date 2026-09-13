const defaultApiBase = `${window.location.protocol}//${window.location.hostname}:8000`

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || defaultApiBase

export function getCsrfToken() {
  return document.cookie.split('; ').find((cookie) => cookie.startsWith('csrftoken='))?.split('=')[1] || ''
}

export async function ensureCsrfCookie() {
  await fetch(`${API_BASE_URL}/api/auth/session/`, { credentials: 'include' })
}

export async function apiFetch(path, options = {}) {
  const headers = new Headers(options.headers || {})
  const method = (options.method || 'GET').toUpperCase()
  if (method !== 'GET' && method !== 'HEAD') {
    headers.set('X-CSRFToken', getCsrfToken())
  }
  return fetch(`${API_BASE_URL}${path}`, { ...options, headers, credentials: 'include' })
}
