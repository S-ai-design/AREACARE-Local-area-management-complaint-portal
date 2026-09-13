import './CitizenHome.css'
import { Link } from 'react-router-dom'

function CitizenHome() {
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
        </div>
        <div className="citizen-home-illustration" aria-hidden="true">
          <span className="city-sun" />
          <i className="fa-solid fa-city" />
          <span className="city-road" />
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
