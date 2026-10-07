import { useEffect, useState } from 'react'
import { toast } from 'react-toastify'
import './AdminDashboard.css'
import { API_BASE_URL } from '../auth/api'

const emptyData = { complaints: [], filters: { categories: [], locations: [], staff: [] }, summary: {}, analytics: { status: [], category: [], priority: [] }, staff_performance: [], notifications: [] }
const navigationItems = [
  ['Dashboard', 'fa-grid-2'], ['All complaints', 'fa-inbox'], ['New complaints', 'fa-bell'], ['Pending', 'fa-hourglass-half'],
  ['In progress', 'fa-person-running'], ['Resolved', 'fa-circle-check'], ['Closed', 'fa-lock'], ['High priority', 'fa-triangle-exclamation'],
  ['Overdue', 'fa-clock'], ['Staff management', 'fa-users'], ['Categories', 'fa-tags'], ['Reports & analytics', 'fa-chart-line'],
  ['Notifications', 'fa-bell'], ['Settings', 'fa-gear'],
]

function csrfToken() {
  return document.cookie.split('; ').find((cookie) => cookie.startsWith('csrftoken='))?.split('=')[1] || ''
}

function AdminDashboard() {
  const [data, setData] = useState(emptyData)
  const [filters, setFilters] = useState({ search: '', status: '', priority: '', category: '', location: '', staff: '', overdue: '', date_from: '', date_to: '', sort: '-created_at' })
  const [selected, setSelected] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [isUpdating, setIsUpdating] = useState(false)
  const [activeCard, setActiveCard] = useState('')
  const [activeNav, setActiveNav] = useState('Dashboard')
  const [detailComplaint, setDetailComplaint] = useState(null)
  async function loadDashboard(nextFilters = filters) {
    setIsLoading(true)
    try {
      const params = new URLSearchParams(Object.entries(nextFilters).filter(([, value]) => value))
      const response = await fetch(`${API_BASE_URL}/api/admin/dashboard/?${params}`, { credentials: 'include' })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || 'Unable to load the admin dashboard.')
      setData(result)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to connect to the admin server.')
    } finally { setIsLoading(false) }
  }

  useEffect(() => {
    const initialLoad = window.setTimeout(() => loadDashboard(), 0)
    return () => window.clearTimeout(initialLoad)
    // loadDashboard is stable for the dashboard lifetime.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!detailComplaint || detailComplaint.history) return
    fetch(`${API_BASE_URL}/api/complaints/${encodeURIComponent(detailComplaint.id)}/`, { credentials: 'include' })
      .then((response) => response.json().then((result) => ({ response, result })))
      .then(({ response, result }) => { if (response.ok) setDetailComplaint(result) })
      .catch(() => toast.error('Unable to load complaint history.'))
  }, [detailComplaint])

  function changeFilter(event) {
    const next = { ...filters, [event.target.name]: event.target.value }
    setFilters(next)
    loadDashboard(next)
  }

  function toggleSelected(id) {
    setSelected((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id])
  }

  async function updateComplaint(id, changes) {
    setIsUpdating(true)
    try {
      const response = await fetch(`${API_BASE_URL}/api/complaints/${encodeURIComponent(id)}/`, { method: 'PATCH', credentials: 'include', headers: { 'Content-Type': 'application/json', 'X-CSRFToken': csrfToken() }, body: JSON.stringify(changes) })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || 'Status update failed.')
      toast.success('Complaint status updated.')
      await loadDashboard()
      setDetailComplaint(null)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to update complaint status.')
    } finally { setIsUpdating(false) }
  }

  async function updateStatus(id, status) { await updateComplaint(id, { status }) }

  function handleNavigation(item) {
    setActiveNav(item)
    const presets = {
      Dashboard: { status: '', priority: '', overdue: '' },
      'All complaints': { status: '', priority: '', overdue: '' },
      'New complaints': { status: 'SUBMITTED', priority: '', overdue: '' },
      Pending: { status: 'SUBMITTED', priority: '', overdue: '' },
      'In progress': { status: 'IN_PROGRESS', priority: '', overdue: '' },
      Resolved: { status: 'RESOLVED', priority: '', overdue: '' },
      Closed: { status: 'CLOSED', priority: '', overdue: '' },
      'High priority': { status: '', priority: 'HIGH', overdue: '' },
      Overdue: { status: '', priority: '', overdue: '1' },
    }
    if (presets[item]) {
      const next = { ...filters, ...presets[item] }
      setFilters(next)
      setActiveCard('')
      loadDashboard(next)
      return
    }
    const target = item === 'Staff management' ? '.staff-performance-panel' : item === 'Categories' || item === 'Reports & analytics' ? '.analytics-panel' : ''
    if (target) document.querySelector(target)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    else if (item === 'Notifications') toast.info(data.notifications.length ? `${data.notifications.length} unread notifications available.` : 'No unread notifications.')
    else toast.info('Dashboard settings are not available yet.')
  }
  const summary = data.summary
  const cards = [['total', 'Total complaints', 'fa-inbox'], ['new', 'New / pending', 'fa-bell'], ['assigned', 'Assigned', 'fa-user-check'], ['in_progress', 'In progress', 'fa-person-running'], ['resolved', 'Resolved', 'fa-circle-check'], ['closed', 'Closed', 'fa-lock'], ['rejected', 'Rejected', 'fa-circle-xmark'], ['overdue', 'Overdue / SLA breached', 'fa-clock'], ['high_priority', 'High priority', 'fa-triangle-exclamation']]

  return <main className="admin-dashboard-page">
    <aside className="admin-sidebar"><div className="admin-brand"><span><i className="fa-solid fa-shield-halved" /></span><div><strong>AreaCare</strong><small>Admin console</small></div></div><nav aria-label="Admin navigation">{navigationItems.map(([item, icon]) => <button className={`admin-nav ${activeNav === item ? 'active' : ''}`} key={item} type="button" onClick={() => handleNavigation(item)}><i className={`fa-solid ${icon}`} />{item}</button>)}</nav></aside>
    <section className="admin-main"><header className="admin-topbar"><div><span className="admin-eyebrow">Municipal operations</span><h1>Complaint command centre</h1><p>Monitor every case, department and service outcome from one place.</p></div><div className="admin-user"><span className="admin-user-avatar">A</span><span><strong>Administrator</strong><small>Superuser access</small></span></div></header>
      <section className="admin-summary-grid" aria-label="Complaint summary">{cards.map(([key, label, icon]) => <button type="button" className={`admin-stat ${activeCard === key ? 'selected' : ''}`} key={key} onClick={() => { setActiveCard(key); const next = { ...filters, status: ['new', 'in_progress', 'resolved', 'closed', 'rejected'].includes(key) ? ({ new: 'SUBMITTED', in_progress: 'IN_PROGRESS', resolved: 'RESOLVED', closed: 'CLOSED', rejected: 'REJECTED' }[key]) : '', priority: key === 'high_priority' ? 'HIGH' : '' }; setFilters(next); loadDashboard(next) }}><i className={`fa-solid ${icon}`} /><strong>{summary[key] ?? 0}</strong><span>{label}</span></button>)}</section>
      <section className="admin-toolbar"><label className="admin-search"><i className="fa-solid fa-magnifying-glass" /><input name="search" value={filters.search} onChange={changeFilter} placeholder="Search title, complainant or city" /></label><select name="status" value={filters.status} onChange={changeFilter}><option value="">All statuses</option><option value="SUBMITTED">New / pending</option><option value="IN_PROGRESS">In progress</option><option value="RESOLVED">Resolved</option><option value="CLOSED">Closed</option><option value="REJECTED">Rejected</option></select><select name="priority" value={filters.priority} onChange={changeFilter}><option value="">All priorities</option><option value="HIGH">High</option><option value="MEDIUM">Medium</option><option value="LOW">Low</option></select><select name="category" value={filters.category} onChange={changeFilter}><option value="">All categories</option>{data.filters.categories.map((item) => <option key={item}>{item}</option>)}</select><select name="location" value={filters.location} onChange={changeFilter}><option value="">All locations</option>{data.filters.locations.map((item) => <option key={item}>{item}</option>)}</select><select name="staff" value={filters.staff} onChange={changeFilter}><option value="">All staff</option>{data.filters.staff.map((item) => <option key={item}>{item}</option>)}</select></section>
      {selected.length > 1 && <section className="compare-bar"><strong>{selected.length} complaints selected</strong><span>Selection is ready for side-by-side review.</span><button type="button" onClick={() => setSelected([])}>Clear selection</button></section>}
      <div className="admin-content-grid"><section className="admin-panel complaint-panel"><div className="panel-heading"><div><span className="admin-eyebrow">Live queue</span><h2>All complaints</h2></div><span className="result-count">{data.complaints.length} results</span></div><div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Select</th><th>Complaint</th><th>Complainant</th><th>Location</th><th>Priority</th><th>Status</th><th>Assigned staff</th><th>Last updated</th></tr></thead><tbody>{isLoading ? <tr><td colSpan="8" className="admin-empty">Loading live complaint data...</td></tr> : data.complaints.length === 0 ? <tr><td colSpan="8" className="admin-empty">No complaints match these filters.</td></tr> : data.complaints.map((item) => <tr key={item.id}><td><input type="checkbox" checked={selected.includes(item.id)} onChange={() => toggleSelected(item.id)} aria-label={`Select ${item.id}`} /></td><td><button type="button" className="complaint-link" onClick={() => setDetailComplaint(item)}><strong>{item.id}</strong><span>{item.title}</span><small>{item.category}</small></button></td><td>{item.complainant}<small>{item.contact}</small></td><td>{item.location}</td><td><select className={`status-select status-${item.priority.toLowerCase()}`} value={item.priority} disabled={isUpdating} onChange={(event) => updateComplaint(item.id, { priority: event.target.value })}><option value="HIGH">High</option><option value="MEDIUM">Medium</option><option value="LOW">Low</option></select></td><td><select className={`status-select status-${item.status.toLowerCase()}`} value={item.status} disabled={isUpdating} onChange={(event) => updateStatus(item.id, event.target.value)}><option value="SUBMITTED">New / pending</option><option value="IN_PROGRESS">In progress</option><option value="RESOLVED">Resolved</option><option value="CLOSED">Closed</option><option value="REJECTED">Rejected</option></select></td><td>{item.assigned_staff}</td><td>{item.last_updated}</td></tr>)}</tbody></table></div></section>
        <aside className="admin-side-panels"><section className="admin-panel"><div className="panel-heading"><h2>Complaint mix</h2><span>All records</span></div>{data.analytics.status.map((item) => <div className="bar-row" key={item.status}><span>{item.status.replace('_', ' ')}</span><div><i style={{ width: `${Math.max(4, (item.count / Math.max(1, summary.total)) * 100)}%` }} /></div><strong>{item.count}</strong></div>)}{data.analytics.category.slice(0, 5).map((item) => <div className="bar-row" key={item.Category__catego}><span>{item.Category__catego}</span><div><i className="category-bar" style={{ width: `${Math.max(4, (item.count / Math.max(1, summary.total)) * 100)}%` }} /></div><strong>{item.count}</strong></div>)}</section><section className="admin-panel"><div className="panel-heading"><h2>Staff performance</h2><span>{data.staff_performance.length} staff</span></div>{data.staff_performance.length === 0 ? <p className="admin-empty">No staff accounts found.</p> : data.staff_performance.map((staff) => <button type="button" className="staff-row" key={staff.name} onClick={() => { const next = { ...filters, staff: staff.name }; setFilters(next); loadDashboard(next) }}><span className="staff-avatar">{staff.name.charAt(0)}</span><span><strong>{staff.name}</strong><small>{staff.total} assigned · {staff.resolved} resolved</small></span><i className="fa-solid fa-chevron-right" /></button>)}</section></aside></div>
      {detailComplaint && <div className="admin-modal-backdrop" role="presentation" onClick={() => setDetailComplaint(null)}><section className="admin-modal" role="dialog" aria-modal="true" aria-labelledby="complaint-detail-title" onClick={(event) => event.stopPropagation()}><div className="panel-heading"><div><span className="admin-eyebrow">Complaint record</span><h2 id="complaint-detail-title">{detailComplaint.id}</h2></div><button type="button" className="modal-close" onClick={() => setDetailComplaint(null)} aria-label="Close complaint details">&times;</button></div><h3>{detailComplaint.title}</h3><p>{detailComplaint.description || 'No description provided.'}</p><dl className="detail-grid"><div><dt>Complainant</dt><dd>{detailComplaint.complainant}</dd></div><div><dt>Contact</dt><dd>{detailComplaint.contact}</dd></div><div><dt>Category</dt><dd>{detailComplaint.category}</dd></div><div><dt>Location</dt><dd>{detailComplaint.location}</dd></div><div><dt>Created</dt><dd>{detailComplaint.created_at}</dd></div><div><dt>Last updated</dt><dd>{detailComplaint.last_updated}</dd></div></dl><label className="modal-field">Assigned staff<input value={detailComplaint.assigned_staff === 'Unassigned' ? '' : detailComplaint.assigned_staff} placeholder="Enter staff name" onChange={(event) => setDetailComplaint({ ...detailComplaint, assigned_staff: event.target.value })} /></label><button type="button" className="save-assignment" disabled={isUpdating} onClick={() => updateComplaint(detailComplaint.id, { worker_name: detailComplaint.assigned_staff })}>Save assignment</button></section></div>}
    </section></main>
}

export default AdminDashboard
