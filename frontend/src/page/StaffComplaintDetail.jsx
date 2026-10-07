import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { toast } from 'react-toastify'
import { apiFetch } from '../auth/api'
import './StaffComplaintDetail.css'

function StaffComplaintDetail() {
  const { complaintId } = useParams()
  const [complaint, setComplaint] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isUpdating, setIsUpdating] = useState(false)
  const [workerName, setWorkerName] = useState('')
  const [workerPhone, setWorkerPhone] = useState('')

  useEffect(() => {
    async function loadComplaint() {
      try {
        const response = await apiFetch(`/api/complaints/${encodeURIComponent(complaintId)}/`)
        const result = await response.json()
        if (!response.ok) {
          toast.error(result.error || 'Complaint not found.')
          return
        }
        setComplaint(result)
        setWorkerName(result.worker_name || '')
        setWorkerPhone(result.worker_phone || '')
      } catch {
        toast.error('Unable to connect to the complaint server.')
      } finally {
        setIsLoading(false)
      }
    }

    loadComplaint()
  }, [complaintId])

  async function updateStatus(newStatus) {
    setIsUpdating(true)
    try {
      const response = await apiFetch(`/api/complaints/${encodeURIComponent(complaintId)}/`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })
      const result = await response.json()
      if (!response.ok) {
        toast.error(result.error || 'Status update failed.')
        return
      }
      setComplaint(result)
      toast.success(`Case marked ${newStatus === 'IN_PROGRESS' ? 'in progress' : 'resolved'}.`)
    } catch {
      toast.error('Unable to connect to the complaint server.')
    } finally {
      setIsUpdating(false)
    }
  }

  async function assignWorker(event) {
    event.preventDefault()
    setIsUpdating(true)
    try {
      const response = await apiFetch(`/api/complaints/${encodeURIComponent(complaintId)}/`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ worker_name: workerName, worker_phone: workerPhone }),
      })
      const result = await response.json()
      if (!response.ok) {
        toast.error(result.error || 'Worker assignment failed.')
        return
      }
      setComplaint(result)
      toast.success('Worker assigned successfully.')
    } catch {
      toast.error('Unable to connect to the complaint server.')
    } finally {
      setIsUpdating(false)
    }
  }

  if (isLoading) return <main className="staff-detail-page"><div className="staff-detail-loading">Loading complaint details...</div></main>
  if (!complaint) return <main className="staff-detail-page"><div className="staff-detail-loading">Complaint details are unavailable.</div></main>

  return (
    <main className="staff-detail-page">
      <div className="staff-detail-topbar"><Link className="detail-back-link" to="/staff/dashboard"><i className="fa-solid fa-arrow-left" aria-hidden="true" /> Back to action queue</Link><span className="detail-secure-label"><i className="fa-solid fa-lock" aria-hidden="true" /> Staff workspace</span></div>
      <section className="staff-detail-header"><div><p className="detail-eyebrow">Complaint case / {complaint.id}</p><h1>{complaint.title}</h1><p className="detail-subtitle">Submitted {complaint.created_at} · {complaint.category}</p></div><span className="detail-status">{complaint.status}</span></section>
      <div className="detail-layout">
        <section className="detail-main-column">
          <article className="detail-panel"><div className="detail-panel-heading"><h2>Case progress</h2><span>Current stage</span></div><div className="detail-timeline"><div className="timeline-item timeline-complete"><span className="timeline-dot"><i className="fa-solid fa-check" /></span><div><strong>Complaint submitted</strong><small>Received by AreaCare · {complaint.created_at}</small></div></div><div className={`timeline-item ${complaint.status !== 'SUBMITTED' ? 'timeline-complete' : 'timeline-current'}`}><span className="timeline-dot"><i className={`fa-solid ${complaint.status !== 'SUBMITTED' ? 'fa-check' : 'fa-clipboard-list'}`} /></span><div><strong>Field action</strong><small>{complaint.status === 'SUBMITTED' ? 'Review the location and begin resolution work.' : 'Work is currently being handled by field staff.'}</small></div></div><div className={`timeline-item ${complaint.status === 'RESOLVED' ? 'timeline-complete' : ''}`}><span className="timeline-dot">{complaint.status === 'RESOLVED' && <i className="fa-solid fa-check" />}</span><div><strong>Resolution confirmed</strong><small>{complaint.status === 'RESOLVED' ? 'The complaint has been resolved.' : 'Pending completion and proof of resolution.'}</small></div></div></div></article>
          <article className="detail-panel"><div className="detail-panel-heading"><h2>Issue description</h2><span className={`detail-priority priority-${complaint.priority.toLowerCase()}`}>{complaint.priority} priority</span></div><p className="detail-description">{complaint.description}</p></article>
          <article className="detail-panel"><div className="detail-panel-heading"><h2>Location</h2><button type="button" className="detail-map-button" onClick={() => window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(complaint.address)}`, '_blank', 'noopener,noreferrer')}><i className="fa-solid fa-map-location-dot" aria-hidden="true" /> Open map</button></div><div className="detail-location"><i className="fa-solid fa-location-dot" aria-hidden="true" /><span>{complaint.address}</span></div><div className="detail-map-preview"><i className="fa-solid fa-map" aria-hidden="true" /><span>Field location preview</span></div></article>
        </section>
        <aside className="detail-side-column"><article className="detail-panel detail-facts"><h2>Case summary</h2><dl><div><dt>Ticket ID</dt><dd>{complaint.id}</dd></div><div><dt>Category</dt><dd>{complaint.category}</dd></div><div><dt>Priority</dt><dd>{complaint.priority}</dd></div><div><dt>Status</dt><dd>{complaint.status.replace('_', ' ')}</dd></div></dl></article><article className="detail-panel worker-panel"><div className="detail-panel-heading"><h2>Assign field worker</h2><i className="fa-solid fa-user-hard-hat" /></div><form onSubmit={assignWorker}><label htmlFor="worker-name">Worker name</label><input id="worker-name" type="text" placeholder="e.g. Ramesh Kumar" value={workerName} onChange={(event) => setWorkerName(event.target.value)} required /><label htmlFor="worker-phone">Worker phone</label><input id="worker-phone" type="tel" placeholder="e.g. 9876543210" value={workerPhone} onChange={(event) => setWorkerPhone(event.target.value)} required /><button type="submit" disabled={isUpdating}><i className="fa-solid fa-user-check" aria-hidden="true" /> {isUpdating ? 'Saving...' : 'Save worker assignment'}</button></form></article><article className="detail-panel detail-action-panel"><span className="action-icon"><i className="fa-solid fa-hammer" /></span><h2>Update case status</h2><p>Keep the resident informed as field work moves forward.</p>{complaint.status === 'SUBMITTED' && <button type="button" disabled={isUpdating} onClick={() => updateStatus('IN_PROGRESS')}>{isUpdating ? 'Updating...' : 'Mark as in progress'} <i className="fa-solid fa-arrow-right" aria-hidden="true" /></button>}{complaint.status === 'IN_PROGRESS' && <button type="button" disabled={isUpdating} onClick={() => updateStatus('RESOLVED')}>{isUpdating ? 'Updating...' : 'Mark as resolved'} <i className="fa-solid fa-check" aria-hidden="true" /></button>}{complaint.status === 'RESOLVED' && <span className="resolved-message"><i className="fa-solid fa-circle-check" /> This case is resolved.</span>}</article></aside>
      </div>
    </main>
  )
}

export default StaffComplaintDetail
