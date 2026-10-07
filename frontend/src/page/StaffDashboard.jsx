import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { toast } from 'react-toastify'
import { apiFetch } from '../auth/api'
import './StaffDashboard.css'

function StaffDashboard() {
  const [complaints, setComplaints] = useState([])
  const [staffInfo, setStaffInfo] = useState({ username: '', name: '', department: 'All', is_admin: false })
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [activeNav, setActiveNav] = useState('Staff Work Console')
  const [queueFilter, setQueueFilter] = useState('all')
  const [deptFilter, setDeptFilter] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [isUpdating, setIsUpdating] = useState(false)

  async function loadComplaints(dept = deptFilter) {
    setIsLoading(true)
    try {
      const url = dept === 'all' ? '/api/complaints/list/?all=1' : `/api/complaints/list/?department=${encodeURIComponent(dept)}`
      const response = await apiFetch(url)
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
      if (result.staff_info) {
        setStaffInfo(result.staff_info)
      }
      setLoadError('')
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to connect to the staff server.'
      setLoadError(message)
      toast.error(message)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadComplaints()
  }, [])

  function handleQueueNavigation(label) {
    setActiveNav(label)
    if (label === 'My Alerts') {
      setQueueFilter('alerts')
    } else if (label === 'Assigned Complaints') {
      setQueueFilter('assigned')
    } else {
      setQueueFilter('all')
    }
  }

  function handleDeptChange(event) {
    const val = event.target.value
    setDeptFilter(val)
    loadComplaints(val)
  }

  async function handleQuickStatusUpdate(complaintId, newStatus) {
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
      toast.success(`Complaint ${complaintId} marked ${newStatus === 'IN_PROGRESS' ? 'In Progress' : 'Resolved'}.`)
      await loadComplaints()
    } catch {
      toast.error('Unable to update complaint status.')
    } finally {
      setIsUpdating(false)
    }
  }

  const visibleComplaints = complaints.filter((c) => {
    const matchesQueue =
      queueFilter === 'all'
        ? true
        : queueFilter === 'alerts'
        ? c.priority === 'HIGH' || c.priority === 'EMERGENCY'
        : queueFilter === 'assigned'
        ? Boolean(c.assigned_staff && c.assigned_staff !== 'Unassigned')
        : true

    const matchesStatus = !statusFilter || c.status === statusFilter
    const query = searchQuery.trim().toLowerCase()
    const matchesSearch =
      !query ||
      `${c.id} ${c.title} ${c.category} ${c.ward} ${c.location} ${c.complainant} ${c.assigned_staff}`
        .toLowerCase()
        .includes(query)

    return matchesQueue && matchesStatus && matchesSearch
  })

  const countTotal = complaints.length
  const countPending = complaints.filter((c) => c.status === 'SUBMITTED').length
  const countInProgress = complaints.filter((c) => c.status === 'IN_PROGRESS').length
  const countResolved = complaints.filter((c) => c.status === 'RESOLVED' || c.status === 'CLOSED').length
  const countHighPriority = complaints.filter((c) => c.priority === 'HIGH' || c.priority === 'EMERGENCY').length

  const queueTitle =
    queueFilter === 'alerts'
      ? 'High Priority Alerts'
      : queueFilter === 'assigned'
      ? 'Assigned Complaints Queue'
      : 'All Field Complaints Queue'

  return (
    <main className="staff-dashboard-page">
      <aside className="staff-dashboard-sidebar">
        <div className="staff-profile">
          <span className="staff-avatar">{staffInfo.name ? staffInfo.name[0].toUpperCase() : 'S'}</span>
          <div>
            <strong>{staffInfo.name || staffInfo.username || 'Field Staff'}</strong>
            <span>Dept: {staffInfo.department || 'General'}</span>
            <span className="badge bg-primary text-white mt-1" style={{ fontSize: '11px', width: 'fit-content' }}>
              {staffInfo.is_admin ? 'ADMIN' : 'STAFF'}
            </span>
          </div>
        </div>

        <nav className="staff-dashboard-nav" aria-label="Staff console navigation">
          <button
            className={`staff-nav-item ${activeNav === 'Staff Work Console' ? 'active' : ''}`}
            type="button"
            onClick={() => handleQueueNavigation('Staff Work Console')}
          >
            <i className="fa-solid fa-wave-square" /> All Complaints
          </button>
          <button
            className={`staff-nav-item ${activeNav === 'Assigned Complaints' ? 'active' : ''}`}
            type="button"
            onClick={() => handleQueueNavigation('Assigned Complaints')}
          >
            <i className="fa-regular fa-square-check" /> Assigned Tasks
          </button>
          <button
            className={`staff-nav-item ${activeNav === 'My Alerts' ? 'active' : ''}`}
            type="button"
            onClick={() => handleQueueNavigation('My Alerts')}
          >
            <i className="fa-regular fa-bell" /> High Priority ({countHighPriority})
          </button>
          <Link className="staff-nav-item" to="/register-staff">
            <i className="fa-solid fa-user-gear" /> Register Staff
          </Link>
          <Link className="staff-nav-item" to="/Citizen">
            <i className="fa-solid fa-location-dot" /> Submit Complaint
          </Link>
        </nav>
      </aside>

      <section className="staff-dashboard-content">
        <div className="staff-summary-grid">
          <article className="staff-summary-card" onClick={() => setStatusFilter('')} style={{ cursor: 'pointer' }}>
            <div>
              <strong>{countTotal}</strong>
              <span>Total Database Records</span>
            </div>
            <i className="fa-solid fa-database text-primary" />
          </article>
          <article className="staff-summary-card" onClick={() => setStatusFilter('SUBMITTED')} style={{ cursor: 'pointer' }}>
            <div>
              <strong>{countPending}</strong>
              <span>Pending Action</span>
            </div>
            <i className="fa-solid fa-clock text-warning" />
          </article>
          <article className="staff-summary-card" onClick={() => setStatusFilter('IN_PROGRESS')} style={{ cursor: 'pointer' }}>
            <div>
              <strong>{countInProgress}</strong>
              <span>Currently In Progress</span>
            </div>
            <i className="fa-solid fa-person-running text-info" />
          </article>
          <article className="staff-summary-card" onClick={() => setStatusFilter('RESOLVED')} style={{ cursor: 'pointer' }}>
            <div>
              <strong>{countResolved}</strong>
              <span>Resolved Cases</span>
            </div>
            <i className="fa-solid fa-circle-check text-success" />
          </article>
        </div>

        <section className="action-queue" aria-labelledby="queue-title">
          <div className="queue-heading">
            <div>
              <h1 id="queue-title">{queueTitle}</h1>
              <p>Showing {visibleComplaints.length} of {countTotal} database complaints</p>
            </div>
            <div className="queue-controls d-flex flex-wrap gap-2">
              <label>
                <i className="fa-solid fa-magnifying-glass" aria-hidden="true" />
                <input
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Search complaints, city, citizen..."
                  aria-label="Search complaints"
                />
              </label>

              <select
                value={deptFilter}
                onChange={handleDeptChange}
                aria-label="Filter by department"
                style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #d1d5db' }}
              >
                <option value="all">All Departments</option>
                <option value="roads">Roads &amp; Potholes</option>
                <option value="water">Water &amp; Drainage</option>
                <option value="electricity">Electricity &amp; Streetlights</option>
                <option value="waste">Waste &amp; Sanitation</option>
                <option value="parks">Parks &amp; Public Space</option>
              </select>

              <select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
                aria-label="Filter complaints by status"
                style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #d1d5db' }}
              >
                <option value="">All Statuses</option>
                <option value="SUBMITTED">Pending (Submitted)</option>
                <option value="ASSIGNED">Assigned</option>
                <option value="IN_PROGRESS">In Progress</option>
                <option value="UNDER_REVIEW">Under Review</option>
                <option value="RESOLVED">Resolved</option>
                <option value="CLOSED">Closed</option>
              </select>
            </div>
          </div>

          <div className="queue-table-wrap">
            <table className="queue-table">
              <thead>
                <tr>
                  <th>Ticket ID</th>
                  <th>Title &amp; Category</th>
                  <th>Location &amp; Complainant</th>
                  <th>Priority</th>
                  <th>Status</th>
                  <th>Worker</th>
                  <th>Quick Action</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td className="empty-queue" colSpan="7">Loading complaints from database...</td>
                  </tr>
                ) : loadError ? (
                  <tr>
                    <td className="empty-queue queue-error" colSpan="7">{loadError}</td>
                  </tr>
                ) : visibleComplaints.length === 0 ? (
                  <tr>
                    <td className="empty-queue" colSpan="7">
                      No complaints found matching current filters.
                    </td>
                  </tr>
                ) : (
                  visibleComplaints.map((c) => (
                    <tr key={c.id}>
                      <td>
                        <Link className="ticket-link fw-bold" to={`/staff/complaints/${c.id}`}>
                          {c.id}
                        </Link>
                      </td>
                      <td>
                        <strong>{c.title || 'Untitled complaint'}</strong>
                        <span className="ticket-category d-block text-muted small">
                          <i className="fa-solid fa-tag me-1" /> {c.category || 'General'}
                        </span>
                      </td>
                      <td>
                        <div className="small fw-semibold">{c.ward || c.location || '-'}</div>
                        <div className="text-muted small">
                          <i className="fa-solid fa-user me-1" /> {c.complainant || 'Citizen'}
                        </div>
                      </td>
                      <td>
                        <span className={`priority priority-${(c.priority || 'MEDIUM').toLowerCase()}`}>
                          {c.priority || 'MEDIUM'}
                        </span>
                      </td>
                      <td>
                        <span className={`status status-${(c.status || 'SUBMITTED').toLowerCase()}`}>
                          {c.status || 'SUBMITTED'}
                        </span>
                      </td>
                      <td>
                        <span className="small text-secondary">
                          {c.assigned_staff || 'Unassigned'}
                        </span>
                      </td>
                      <td>
                        <div className="d-flex gap-1 align-items-center">
                          <Link className="view-details btn btn-sm btn-outline-primary" to={`/staff/complaints/${c.id}`}>
                            Details
                          </Link>
                          {c.status === 'SUBMITTED' && (
                            <button
                              type="button"
                              className="btn btn-sm btn-info text-white"
                              disabled={isUpdating}
                              onClick={() => handleQuickStatusUpdate(c.id, 'IN_PROGRESS')}
                              title="Start working on this complaint"
                            >
                              Start
                            </button>
                          )}
                          {c.status === 'IN_PROGRESS' && (
                            <button
                              type="button"
                              className="btn btn-sm btn-success text-white"
                              disabled={isUpdating}
                              onClick={() => handleQuickStatusUpdate(c.id, 'RESOLVED')}
                              title="Mark as resolved"
                            >
                              Resolve
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      </section>
    </main>
  )
}

export default StaffDashboard
