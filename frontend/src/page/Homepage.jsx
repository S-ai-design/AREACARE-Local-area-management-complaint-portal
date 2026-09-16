import './Homepage.css'
import { Link } from 'react-router-dom'
import indiaHero from '../assets/india_hero.jpg'

function Homepage() {
  return (
    <main className="homepage">
      <section className="home-hero" aria-labelledby="home-title" style={{ backgroundImage: `linear-gradient(90deg, rgb(12 29 39 / 88%) 0%, rgb(12 29 39 / 64%) 48%, rgb(12 29 39 / 38%) 100%), url(${indiaHero})` }}>
        <div className="home-hero-content">
          <p className="home-eyebrow"><i className="fa-solid fa-location-dot" aria-hidden="true" /> AreaCare / civic response</p>
          <h1 id="home-title">Report.<br /><em>Resolve</em><br />Improve.</h1>
          <p className="home-lede">A simpler way to report what needs attention in your neighborhood and see what happens next.</p>
          <div className="home-actions">
            <Link className="home-primary-action" to="/citizen/complaint">Report an issue <i className="fa-solid fa-arrow-up-right-from-square" aria-hidden="true" /></Link>
            <Link className="home-text-action" to="/citizen">Explore citizen services <i className="fa-solid fa-arrow-right" aria-hidden="true" /></Link>
          </div>
        </div>
        <div className="home-hero-note"><span className="live-dot" /> Live across your municipality <strong>24/7</strong></div>
      </section>

      <section className="home-quick-section" aria-labelledby="quick-title">
        <div className="home-section-top"><div><p className="section-label">Start here</p><h2 id="quick-title">Small reports.<br />Meaningful change.</h2></div><p className="section-description">From a broken streetlight to overflowing waste, give local teams the detail they need to respond faster.</p></div>
        <div className="home-quick-grid">
          <Link className="home-quick-card home-quick-card-accent" to="/citizen/complaint"><span className="quick-card-number">01</span><i className="fa-solid fa-bullhorn" aria-hidden="true" /><h3>Report a problem</h3><p>Share the issue, location, and a few useful details.</p><span className="quick-arrow"><i className="fa-solid fa-arrow-right" aria-hidden="true" /></span></Link>
          <Link className="home-quick-card" to="/citizen/complaint"><span className="quick-card-number">02</span><i className="fa-solid fa-route" aria-hidden="true" /><h3>Follow progress</h3><p>Keep your complaint reference close and stay informed.</p><span className="quick-arrow"><i className="fa-solid fa-arrow-right" aria-hidden="true" /></span></Link>
          <Link className="home-quick-card" to="/stafflogin"><span className="quick-card-number">03</span><i className="fa-solid fa-people-group" aria-hidden="true" /><h3>Work together</h3><p>Field teams turn community reports into visible results.</p><span className="quick-arrow"><i className="fa-solid fa-arrow-right" aria-hidden="true" /></span></Link>
        </div>
      </section>

      <section className="home-bottom-banner"><div><p className="section-label">Built for better neighborhoods</p><h2>One clear channel<br />for every concern.</h2></div><Link to="/citizen/complaint" aria-label="Submit a new complaint"><i className="fa-solid fa-plus" /></Link></section>

      <section className="home-information" aria-labelledby="information-title">
        <div className="home-information-heading"><p className="section-label">Need help now?</p><h2 id="information-title">Important numbers</h2><p>For immediate danger, call the emergency service directly. Use AreaCare for non-emergency civic issues and follow-up.</p></div>
        <div className="emergency-grid">
          <a className="emergency-card emergency-card-hot" href="tel:112"><span><i className="fa-solid fa-phone" aria-hidden="true" /> Emergency</span><strong>112</strong><small>Immediate danger or urgent help</small></a>
          <a className="emergency-card" href="tel:100"><span><i className="fa-solid fa-shield-halved" aria-hidden="true" /> Police</span><strong>100</strong><small>Safety and law enforcement</small></a>
          <a className="emergency-card" href="tel:108"><span><i className="fa-solid fa-truck-medical" aria-hidden="true" /> Ambulance</span><strong>108</strong><small>Medical emergency response</small></a>
          <a className="emergency-card" href="tel:101"><span><i className="fa-solid fa-fire-extinguisher" aria-hidden="true" /> Fire service</span><strong>101</strong><small>Fire and rescue assistance</small></a>
        </div>
      </section>

      <section className="home-report-guide" aria-labelledby="guide-title">
        <div><p className="section-label">Make your report useful</p><h2 id="guide-title">A little detail<br />goes a long way.</h2></div>
        <div className="report-guide-list"><p><span>01</span><strong>Describe the issue</strong><small>Tell us what is happening and how long it has been there.</small></p><p><span>02</span><strong>Share the exact location</strong><small>Add the area, road, city, pincode, and state.</small></p><p><span>03</span><strong>Leave a way to reach you</strong><small>We will use your contact details only for updates.</small></p></div>
      </section>
    </main>
  )
}

export default Homepage
