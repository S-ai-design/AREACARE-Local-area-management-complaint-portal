import { useState } from 'react'
import './Citizen.css'
import { toast } from 'react-toastify'

const initialForm = {
  title: '',
  category: '',
  area: '',
  road: '',
  city: '',
  pincode: '',
  state: '',
  description: '',
  urgency: 'normal',
  name: '',
  email: '',
  phone: '',
}

function Citizen() {
  const [formData, setFormData] = useState(initialForm)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [mapQuery, setMapQuery] = useState('')

  function handleChange(event) {
    const { name, value } = event.target
    setFormData((currentForm) => ({ ...currentForm, [name]: value }))
  }

  function showAddressOnMap() {
    const address = [formData.area, formData.road, formData.city, formData.pincode, formData.state]
      .filter(Boolean)
      .join(', ')

    if (!address) {
      toast.info('Enter an address before opening the map.')
      return
    }

    setMapQuery(address)
  }

  function clearForm() {
    setFormData(initialForm)
    setMapQuery('')
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setIsSubmitting(true)

    try {
      const response = await fetch('http://127.0.0.1:8000/api/complaints/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })
      const result = await response.json()

      if (!response.ok) {
        toast.error(result.error || 'The complaint could not be saved.')
        return
      }

      toast.success(`${result.message} ID: ${result.complaint_id}`)
      setFormData(initialForm)
      setMapQuery('')
    } catch {
      toast.error('Unable to connect to the complaint server.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main className="citizen-page">
      <section className="citizen-shell" aria-labelledby="citizen-title">
        <div className="citizen-intro">
          <div className="citizen-badge"><i className="fa-solid fa-bullhorn" aria-hidden="true" /> Citizen services</div>
          <h1 id="citizen-title">Raise a complaint</h1>
          <p>Tell us what happened and help us make your neighborhood better.</p>
          <div className="citizen-help-row">
            <span><i className="fa-solid fa-location-dot" aria-hidden="true" /> Trackable request</span>
            <span><i className="fa-solid fa-clock" aria-hidden="true" /> Response within 48 hours</span>
          </div>
        </div>

        <form className="complaint-form" onSubmit={handleSubmit}>
          <div className="form-section-heading">
            <span className="section-number">01</span>
            <div><h2>Complaint details</h2><p>Give us enough context to send this to the right team.</p></div>
          </div>

          <div className="form-grid">
            <div className="citizen-field field-wide">
              <label htmlFor="complaint-title">Complaint title <span>*</span></label>
              <input id="complaint-title" name="title" type="text" placeholder="e.g. Streetlight not working near Central Park" value={formData.title} onChange={handleChange} required />
            </div>
            <div className="citizen-field">
              <label htmlFor="complaint-category">Category <span>*</span></label>
              <select id="complaint-category" name="category" value={formData.category} onChange={handleChange} required>
                <option value="">Select a category</option>
                <option value="roads">Roads &amp; potholes</option>
                <option value="streetlights">Streetlights</option>
                <option value="water">Water &amp; drainage</option>
                <option value="waste">Waste management</option>
                <option value="parks">Parks &amp; public spaces</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div className="citizen-field">
              <label htmlFor="complaint-urgency">Urgency</label>
              <select id="complaint-urgency" name="urgency" value={formData.urgency} onChange={handleChange}>
                <option value="normal">Normal</option>
                <option value="high">High priority</option>
                <option value="critical">Emergency</option>
              </select>
            </div>
            <div className="address-heading field-wide">
              <i className="fa-solid fa-location-dot" aria-hidden="true" /> Complaint address
            </div>
            <div className="citizen-field">
              <label htmlFor="complaint-area">Area / Locality <span>*</span></label>
              <input id="complaint-area" name="area" type="text" placeholder="e.g. Green Park" value={formData.area} onChange={handleChange} required />
            </div>
            <div className="citizen-field">
              <label htmlFor="complaint-road">Road / Street <span>*</span></label>
              <input id="complaint-road" name="road" type="text" placeholder="e.g. Main Road" value={formData.road} onChange={handleChange} required />
            </div>
            <div className="citizen-field">
              <label htmlFor="complaint-city">City <span>*</span></label>
              <input id="complaint-city" name="city" type="text" placeholder="Enter city" value={formData.city} onChange={handleChange} required />
            </div>
            <div className="citizen-field">
              <label htmlFor="complaint-pincode">Pincode <span>*</span></label>
              <input id="complaint-pincode" name="pincode" type="number" inputMode="numeric" placeholder="e.g. 110016" value={formData.pincode} onChange={handleChange} required />
            </div>
            <div className="citizen-field field-wide">
              <label htmlFor="complaint-state">State <span>*</span></label>
              <input id="complaint-state" name="state" type="text" placeholder="Enter state" value={formData.state} onChange={handleChange} required />
            </div>
            <div className="map-field field-wide">
              <div className="map-field-heading">
                <div><label htmlFor="complaint-map">Pin complaint location</label><p>Check the address on the map before submitting.</p></div>
                <button type="button" className="map-button" onClick={showAddressOnMap}><i className="fa-solid fa-map-location-dot" aria-hidden="true" /> Show on map</button>
              </div>
              <div className="map-preview" id="complaint-map">
                {mapQuery ? <iframe title="Complaint location map" src={`https://www.google.com/maps?q=${encodeURIComponent(mapQuery)}&output=embed`} loading="lazy" /> : <div className="map-empty"><i className="fa-solid fa-map-location-dot" aria-hidden="true" /><span>Your location preview will appear here</span></div>}
              </div>
            </div>
            <div className="citizen-field field-wide">
              <label htmlFor="complaint-description">Describe the issue <span>*</span></label>
              <textarea id="complaint-description" name="description" rows="5" placeholder="What is the problem? Include useful details such as when it started or who is affected." value={formData.description} onChange={handleChange} required />
            </div>
          </div>

          <div className="form-section-heading contact-heading">
            <span className="section-number">02</span>
            <div><h2>Your contact details</h2><p>We will use these details to share updates about your complaint.</p></div>
          </div>
          <div className="form-grid contact-grid">
            <div className="citizen-field"><label htmlFor="citizen-name">Full name <span>*</span></label><input id="citizen-name" name="name" type="text" placeholder="Your name" value={formData.name} onChange={handleChange} required /></div>
            <div className="citizen-field"><label htmlFor="citizen-phone">Phone number <span>*</span></label><input id="citizen-phone" name="phone" type="tel" placeholder="+91 98765 43210" value={formData.phone} onChange={handleChange} required /></div>
            <div className="citizen-field field-wide"><label htmlFor="citizen-email">Email address</label><input id="citizen-email" name="email" type="email" placeholder="you@example.com" value={formData.email} onChange={handleChange} /></div>
          </div>

          <div className="complaint-actions"><p><i className="fa-solid fa-lock" aria-hidden="true" /> Your information is used only to resolve this complaint.</p><div className="complaint-action-buttons"><button type="button" className="clear-form-button" onClick={clearForm} disabled={isSubmitting}><i className="fa-solid fa-rotate-left" aria-hidden="true" /> Clear form</button><button type="submit" disabled={isSubmitting}><i className="fa-solid fa-paper-plane" aria-hidden="true" /> {isSubmitting ? 'Saving complaint...' : 'Submit complaint'}</button></div></div>
        </form>
      </section>
    </main>
  )
}

export default Citizen
