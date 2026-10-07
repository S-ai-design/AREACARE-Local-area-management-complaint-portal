import { useMemo, useState } from 'react'
import './CitizenHome.css'
import { Link } from 'react-router-dom'

const serviceDirectory = [
  { name: 'Roads & potholes', category: 'Infrastructure', icon: 'fa-road', description: 'Report potholes, damaged roads, and unsafe crossings.' },
  { name: 'Water & drainage', category: 'Utilities', icon: 'fa-droplet', description: 'Flag leaks, flooding, blocked drains, or supply issues.' },
  { name: 'Street lighting', category: 'Safety', icon: 'fa-lightbulb', description: 'Help the city repair dark or damaged street lights.' },
  { name: 'Waste collection', category: 'Cleanliness', icon: 'fa-trash-can', description: 'Report missed collection, litter, or overflowing bins.' },
]

function CitizenHome() {
  const [serviceQuery, setServiceQuery] = useState('')
  const [activeCategory, setActiveCategory] = useState('All')
  const categories = ['All', ...new Set(serviceDirectory.map((service) => service.category))]
  const visibleServices = useMemo(() => serviceDirectory.filter((service) => {
    const matchesCategory = activeCategory === 'All' || service.category === activeCategory
    const searchText = `${service.name} ${service.description}`.toLowerCase()
    return matchesCategory && searchText.includes(serviceQuery.trim().toLowerCase())
  }), [activeCategory, serviceQuery])

  return (
    <main className="citizen-home-page">
      <section className="citizen-home-hero" aria-labelledby="citizen-home-title">
        <div className="citizen-home-hero-copy">
          <div className="citizen-home-eyebrow"><i className="fa-solid fa-city" aria-hidden="true" /> Citizen services</div>
          <h1 id="citizen-home-title">Make your city better, one report at a time.</h1>
          <p>Report local issues, follow their progress, and help your community get the attention it deserves.</p>
          <div className="citizen-home-actions">
            <Link className="citizen-primary-action" to="/citizen/complaint"><i className="fa-solid fa-bullhorn" aria-hidden="true" /> Report an issue</Link>
            <Link className="citizen-secondary-action" to="/citizen/login"><i className="fa-solid fa-magnifying-glass" aria-hidden="true" /> Track a complaint</Link>
          </div>
          <div className="citizen-home-proof"><span><i className="fa-solid fa-location-dot" aria-hidden="true" /> Ward-aware routing</span><span><i className="fa-solid fa-clock" aria-hidden="true" /> Real-time updates</span></div>
        </div>
        <div className="citizen-home-illustration" aria-hidden="true">
          <span className="city-sun" />
          <span className="city-hills" />
          <i className="city-tree city-tree-back fa-solid fa-tree" />
          <i className="city-tree city-tree-front fa-solid fa-tree" />
          <i className="fa-solid fa-city" />
          <span className="city-road" />
          <div className="city-status-card"><span><i className="fa-solid fa-signal" /> CITY PULSE</span><strong>Small reports. Visible change.</strong><div><i /><i /><i /><i /><i /></div></div>
        </div>
      </section>

      <section className="citizen-directory-section" aria-labelledby="citizen-directory-title">
        <div className="citizen-section-heading">
          <span>FIND THE RIGHT SERVICE</span>
          <h2 id="citizen-directory-title">What would you like to report?</h2>
        </div>
        <label className="citizen-service-search">
          <i className="fa-solid fa-magnifying-glass" aria-hidden="true" />
          <input value={serviceQuery} onChange={(event) => setServiceQuery(event.target.value)} placeholder="Search potholes, water, lights..." aria-label="Search city services" />
        </label>
        <div className="citizen-category-filters" aria-label="Service categories">
          {categories.map((category) => <button type="button" className={activeCategory === category ? 'active' : ''} key={category} onClick={() => setActiveCategory(category)}>{category}</button>)}
        </div>
        <div className="citizen-directory-grid">
          {visibleServices.map((service) => <article className="citizen-directory-card" key={service.name}><div className="directory-icon"><i className={`fa-solid ${service.icon}`} aria-hidden="true" /></div><div><span>{service.category}</span><h3>{service.name}</h3><p>{service.description}</p><Link to="/citizen/complaint">Report now <i className="fa-solid fa-arrow-right" aria-hidden="true" /></Link></div></article>)}
          {visibleServices.length === 0 && <p className="citizen-no-results">No matching service found. Try a different search.</p>}
        </div>
      </section>

      <section className="citizen-service-section" aria-labelledby="citizen-services-title">
        <div className="citizen-section-heading"><span>HOW IT WORKS</span><h2 id="citizen-services-title">Your voice moves the city forward</h2></div>
        <div className="citizen-service-grid">
          <article className="citizen-service-card"><span className="service-number">01</span><i className="fa-solid fa-pen-to-square" aria-hidden="true" /><h3>Tell us what happened</h3><p>Share the issue and its exact address with a few simple details.</p></article>
          <article className="citizen-service-card"><span className="service-number">02</span><i className="fa-solid fa-route" aria-hidden="true" /><h3>We route it right</h3><p>Your complaint reaches the department responsible for action.</p></article>
          <article className="citizen-service-card"><span className="service-number">03</span><i className="fa-solid fa-circle-check" aria-hidden="true" /><h3>Follow the progress</h3><p>Use your complaint reference to stay informed as work gets done.</p></article>
        </div>
      </section>

      <section className="citizen-home-notice"><i className="fa-solid fa-shield-heart" aria-hidden="true" /><div><strong>Built for your neighborhood</strong><p>Your contact information is used only to resolve and update you about your complaint.</p></div></section>
    </main>
  )
}

export default CitizenHome
