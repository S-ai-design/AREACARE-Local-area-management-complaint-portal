import { useEffect, useState } from 'react'
import './CitizenTrack.css'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { toast } from 'react-toastify'
import { GoArrowLeft, GoArrowRight, GoSearch, GoPerson, GoDeviceMobile, GoLocation } from 'react-icons/go'
import { apiFetch } from '../auth/api'

async function handleUnauthorized(reference, errorMessage, navigate) {
  try {
    const response = await apiFetch('/api/auth/session/')
    const session = await response.json()
    if (response.ok && session.authenticated) {
      const message = errorMessage === 'Authentication required.'
        ? 'This complaint is not linked to the signed-in account. Sign in with the account used to submit it.'
        : errorMessage || 'This complaint is not linked to the signed-in account.'
      toast.error(message)
      return true
    }
  } catch {
    // Continue to sign-in if the session cannot be checked.
  }
  navigate('/citizen/login', {
    state: { from: '/citizen/track', complaintId: reference },
  })
  return false
}

function CitizenTrack() {
  const location = useLocation()
  const navigate = useNavigate()
  const [complaintId, setComplaintId] = useState(() => location.state?.complaintId || '')
  const [complaint, setComplaint] = useState(null)
  const [isLoading, setIsLoading] = useState(() => Boolean(location.state?.complaintId))

  async function loadComplaint(reference) {
    try {
      const response = await apiFetch(`/api/complaints/${encodeURIComponent(reference)}/`)
      const result = await response.json()
      if (response.status === 401) {
        await handleUnauthorized(reference, result.error, navigate)
        return
      }
      if (!response.ok) {
        toast.error(result.error || 'Complaint not found.')
        return
      }
      setComplaint(result)
    } catch {
      toast.error('Unable to connect to the complaint server.')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    const pendingComplaintId = location.state?.complaintId
    if (!pendingComplaintId) return

    let cancelled = false
    apiFetch(`/api/complaints/${encodeURIComponent(pendingComplaintId)}/`)
      .then(async (response) => ({ response, result: await response.json() }))
      .then(async ({ response, result }) => {
        if (cancelled) return
        if (response.status === 401) {
          const isAuthenticated = await handleUnauthorized(pendingComplaintId, result.error, navigate)
          if (isAuthenticated && !cancelled) setIsLoading(false)
          return
        }
        if (!response.ok) {
          toast.error(result.error || 'Complaint not found.')
        } else {
          setComplaint(result)
        }
        setIsLoading(false)
        navigate(location.pathname, { replace: true, state: null })
      })
      .catch(() => {
        if (!cancelled) {
          toast.error('Unable to connect to the complaint server.')
          setIsLoading(false)
        }
      })

    return () => { cancelled = true }
  }, [location.pathname, location.state, navigate])

  function handleSubmit(event) {
    event.preventDefault()
    setComplaint(null)
    setIsLoading(true)
    loadComplaint(complaintId.trim())
  }

  return (
    <main className="citizen-track-page">
      <section className="citizen-track-card" aria-labelledby="track-title">
        <div className="track-icon"><GoSearch aria-hidden="true" /></div>
        <p className="track-label">Citizen services</p>
        <h1 id="track-title">Track your complaint</h1>
        <p className="track-intro">Enter the complaint reference you received after submitting your issue.</p>
        <form className="track-form" onSubmit={handleSubmit}>
          <label htmlFor="complaint-id">Complaint reference</label>
          <input id="complaint-id" type="text" placeholder="e.g. CP-2026-0001" value={complaintId} onChange={(event) => setComplaintId(event.target.value)} required />
          <button type="submit" disabled={isLoading}><GoArrowRight aria-hidden="true" /> {isLoading ? 'Searching...' : 'Track complaint'}</button>
        </form>
        {complaint && <article className="tracked-complaint"><div className="tracked-header"><div><span className="tracked-id">{complaint.id}</span><h2>{complaint.title}</h2></div><span className="tracked-status">{complaint.status.replace('_', ' ')}</span></div><div className="tracked-details"><p><strong>Category</strong>{complaint.category}</p><p><strong>Priority</strong>{complaint.priority}</p><p><strong>Submitted</strong>{complaint.created_at}</p><p><strong><GoLocation aria-hidden="true" /> Location</strong>{complaint.address}</p><p className="tracked-description"><strong>Description</strong>{complaint.description}</p></div>{complaint.worker_name && <div className="assigned-worker"><div className="worker-avatar"><GoPerson aria-hidden="true" /></div><div><strong>Assigned field worker</strong><span>{complaint.worker_name}</span></div>{complaint.worker_phone && <a href={`tel:${complaint.worker_phone}`}><GoDeviceMobile aria-hidden="true" /> {complaint.worker_phone}</a>}</div>}</article>}
        <Link className="back-to-citizen" to="/citizen"><GoArrowLeft aria-hidden="true" /> Back to citizen services</Link>
      </section>
    </main>
  )
}

export default CitizenTrack
