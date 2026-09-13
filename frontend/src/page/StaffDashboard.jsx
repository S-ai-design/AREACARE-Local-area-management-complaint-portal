import { useEffect, useState } from 'react'
import { toast } from 'react-toastify'
import { apiFetch } from '../auth/api'
import './StaffDashboard.css'

function StaffDashboard() {
  const [complaints, setComplaints] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState('')

  useEffect(() => {
    async function loadComplaints() {
      try {
        const response = await apiFetch('/api/complaints/list/')
        const result = await response.json()
        if (!response.ok) {
          const message = result.error || 'Unable to load the staff work queue.'
          setLoadError(message)
          toast.error(message)
          return
        }
        if (!Array.isArray(result.complaints)) {
          throw new Error('The staff queue returned an invalid response.')
        }
        setComplaints(result.complaints)
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unable to connect to the staff server.'
        setLoadError(message)
        toast.error(message)
      } finally {
        setIsLoading(false)
      }
    }

    loadComplaints()
  }, [])

  return (
    <main className="staff-dashboard-page">
      <aside className="staff-dashboard-sidebar">
        <div className="staff-profile"><span className="staff-avatar">S</span><div><strong>staff.roads</strong><span>Role: STAFF</span></div></div>
        <nav className="staff-dashboard-nav" aria-label="Staff console navigation">
          <a className="staff-nav-item active" href="/staff/dashboard"><i className="fa-solid fa-wave-square" /> Staff Work Console</a>
          <a className="staff-nav-item" href="/staff/dashboard"><i className="fa-regular fa-square-check" /> Assigned Complaints</a>
          <a className="staff-nav-item" href="/register-staff"><i className="fa-solid fa-user-gear" /> Staff Auth &amp; Register</a>
          <a className="staff-nav-item" href="/Citizen"><i className="fa-solid fa-location-dot" /> Area GIS Map</a>
          <a className="staff-nav-item" href="/staff/dashboard"><i className="fa-regular fa-bell" /> My Alerts</a>
        </nav>
      </aside>

      <section className="staff-dashboard-content">
        <div className="staff-summary-grid">
          <article className="staff-summary-card"><div><strong>{complaints.length}</strong><span>Assigned Work Queue</span></div><i className="fa-solid fa-suitcase" /></article>
            <article className="staff-summary-card"><div><strong>{complaints.filter((complaint) => complaint.status === 'IN_PROGRESS').length}</strong><span>Currently In Progress</span></div><i className="fa-solid fa-hourglass-half muted-icon" /></article>
        </div>

        <section className="action-queue" aria-labelledby="queue-title">
          <h1 id="queue-title">My Action Queue</h1>
          <div className="queue-table-wrap">
            <table className="queue-table">
              <thead><tr><th>Ticket ID</th><th>Title &amp; Category</th><th>Ward</th><th>Priority</th><th>Status</th><th>Upvotes</th><th>Action</th></tr></thead>
              <tbody>{isLoading ? <tr><td className="empty-queue" colSpan="7">Loading complaints...</td></tr> : loadError ? <tr><td className="empty-queue queue-error" colSpan="7">{loadError}</td></tr> : complaints.length === 0 ? <tr><td className="empty-queue" colSpan="7">No complaints assigned to your work queue.</td></tr> : complaints.map((complaint) => <tr key={complaint.id}>
                <td><a className="ticket-link" href={`/staff/complaints/${complaint.id}`}>{complaint.id}</a></td>
                <td><strong>{complaint.title || 'Untitled complaint'}</strong><span className="ticket-category">{complaint.category || 'Uncategorized'} <b>•</b> {complaint.detail || 'Citizen complaint'}</span></td>
                <td>{complaint.ward || '-'}</td>
                <td><span className={`priority priority-${(complaint.priority || 'MEDIUM').toLowerCase()}`}>{complaint.priority || 'MEDIUM'}</span></td>
                <td><span className={`status status-${(complaint.status || 'SUBMITTED').toLowerCase()}`}>{complaint.status || 'SUBMITTED'}</span></td>
                <td><span className="upvotes">👍 {complaint.upvotes || 0}</span></td>
                <td><a className="view-details" href={`/staff/complaints/${complaint.id}`}>View<br />Details</a></td>
              </tr>)}</tbody>
            </table>
          </div>
        </section>
      </section>
    </main>
  )
}

export default StaffDashboard
