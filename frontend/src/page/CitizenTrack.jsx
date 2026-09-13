import { useState } from 'react'
import './CitizenTrack.css'
import { Link } from 'react-router-dom'
import { toast } from 'react-toastify'

function CitizenTrack() {
  const [complaintId, setComplaintId] = useState('')
  const [complaint, setComplaint] = useState(null)
  const [isLoading, setIsLoading] = useState(false)

  async function handleSubmit(event) {
    event.preventDefault()
    setComplaint(null)
    setIsLoading(true)

    try {
      const response = await fetch(`http://127.0.0.1:8000/api/complaints/${encodeURIComponent(complaintId.trim())}/`, { credentials: 'include' })
      const result = await response.json()
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

  return (
    <main className="citizen-track-page">
      <section className="citizen-track-card" aria-labelledby="track-title">
        <div className="track-icon"><i className="fa-solid fa-magnifying-glass-location" aria-hidden="true" /></div>
        <p className="track-label">Citizen services</p>
        <h1 id="track-title">Track your complaint</h1>
        <p className="track-intro">Enter the complaint reference you received after submitting your issue.</p>
        <form className="track-form" onSubmit={handleSubmit}>
          <label htmlFor="complaint-id">Complaint reference</label>
          <input id="complaint-id" type="text" placeholder="e.g. CP-2026-0001" value={complaintId} onChange={(event) => setComplaintId(event.target.value)} required />
          <button type="submit" disabled={isLoading}><i className="fa-solid fa-arrow-right" aria-hidden="true" /> {isLoading ? 'Searching...' : 'Track complaint'}</button>
        </form>
        {complaint && <article className="tracked-complaint"><div className="tracked-header"><div><span className="tracked-id">{complaint.id}</span><h2>{complaint.title}</h2></div><span className="tracked-status">{complaint.status.replace('_', ' ')}</span></div><div className="tracked-details"><p><strong>Category</strong>{complaint.category}</p><p><strong>Priority</strong>{complaint.priority}</p><p><strong>Submitted</strong>{complaint.created_at}</p><p><strong>Location</strong>{complaint.address}</p><p className="tracked-description"><strong>Description</strong>{complaint.description}</p></div>{complaint.worker_name && <div className="assigned-worker"><div className="worker-avatar"><i className="fa-solid fa-user-hard-hat" aria-hidden="true" /></div><div><strong>Assigned field worker</strong><span>{complaint.worker_name}</span></div>{complaint.worker_phone && <a href={`tel:${complaint.worker_phone}`}><i className="fa-solid fa-phone" aria-hidden="true" /> {complaint.worker_phone}</a>}</div>}</article>}
        <Link className="back-to-citizen" to="/citizen"><i className="fa-solid fa-arrow-left" aria-hidden="true" /> Back to citizen services</Link>
      </section>
    </main>
  )
}

export default CitizenTrack
