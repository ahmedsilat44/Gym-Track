import { Activity, ArrowLeft, ArrowRight, CheckCircle2, Clock3, Lightbulb, Send } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { featureStatusLabel, listPublicFeatureRequests, submitFeatureRequest } from '../lib/featureRequests'
import { useNavigate } from '../router'

const filters = [
  { value: 'all', label: 'All' },
  { value: 'approved', label: 'Open' },
  { value: 'planned', label: 'Planned' },
  { value: 'completed', label: 'Shipped' },
]

const initialForm = { name: '', email: '', title: '', description: '', website: '' }

export default function FeatureBoard() {
  const navigate = useNavigate()
  const [requests, setRequests] = useState([])
  const [filter, setFilter] = useState('all')
  const [form, setForm] = useState(initialForm)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  useEffect(() => {
    let active = true
    listPublicFeatureRequests()
      .then((items) => { if (active) setRequests(items) })
      .catch(() => { if (active) setError('Feature board could not load. Try again shortly.') })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [])

  const visibleRequests = useMemo(() => requests.filter((request) => filter === 'all' || request.status === filter), [filter, requests])
  const counts = useMemo(() => filters.reduce((result, item) => ({
    ...result,
    [item.value]: item.value === 'all' ? requests.length : requests.filter((request) => request.status === item.value).length,
  }), {}), [requests])

  const updateForm = (field, value) => setForm((current) => ({ ...current, [field]: value }))

  const submit = async (event) => {
    event.preventDefault()
    if (form.website) {
      setMessage('Request received. It will appear after admin review.')
      return
    }
    setBusy(true)
    setError('')
    setMessage('')
    try {
      await submitFeatureRequest(form)
      setForm((current) => ({ ...initialForm, name: current.name, email: current.email }))
      setMessage('Request received. It will appear after admin review.')
    } catch (caught) {
      setError(caught.message || 'Request could not be submitted. Try again.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="feature-board-page">
      <nav className="feature-public-nav" aria-label="Feature board navigation">
        <button className="feature-brand" onClick={() => navigate('/')}><span><Activity /></span>Spotter</button>
        <button className="secondary-button compact" onClick={() => navigate('/')}><ArrowLeft /> Back to sign in</button>
      </nav>

      <header className="feature-board-hero">
        <span className="feature-hero-icon"><Lightbulb /></span>
        <div><h1>Help shape Spotter.</h1><p>See what community wants next, then add one clear request of your own.</p></div>
        <a className="primary-button" href="#request-feature">Request a feature <ArrowRight /></a>
      </header>

      <div className="feature-board-layout">
        <section className="feature-board-list" aria-labelledby="public-requests-title">
          <div className="feature-board-heading">
            <div><h2 id="public-requests-title">Community requests</h2><p>Only requests reviewed and approved by admin appear here.</p></div>
            <span>{requests.length} published</span>
          </div>
          <div className="feature-filter-rail" role="group" aria-label="Filter feature requests">
            {filters.map((item) => <button aria-pressed={filter === item.value} className={filter === item.value ? 'active' : ''} onClick={() => setFilter(item.value)} key={item.value}>{item.label}<span>{counts[item.value] || 0}</span></button>)}
          </div>

          {loading ? <div className="feature-board-state"><Clock3 /> Loading requestsâ€¦</div> : error && !requests.length ? <div className="feature-board-state error" role="alert">{error}</div> : (
            <div className="feature-request-list">
              {visibleRequests.map((request) => (
                <article className="feature-request-row" key={request.id}>
                  <span className={`feature-status ${request.status}`}>{request.status === 'completed' ? <CheckCircle2 /> : <Clock3 />}{featureStatusLabel(request.status)}</span>
                  <div><h3>{request.title}</h3><p>{request.description}</p></div>
                  <time dateTime={request.approved_at || request.created_at}>{new Date(request.approved_at || request.created_at).toLocaleDateString(undefined, { month: 'short', year: 'numeric' })}</time>
                </article>
              ))}
              {!visibleRequests.length && <div className="feature-board-state"><Lightbulb /><strong>{requests.length ? 'No requests in this lane yet.' : 'No published requests yet.'}</strong><span>Send first idea for admin review.</span></div>}
            </div>
          )}
        </section>

        <section className="feature-request-panel" id="request-feature" aria-labelledby="request-feature-title">
          <div><h2 id="request-feature-title">Request a feature</h2><p>Describe problem and useful outcome. Contact details stay private to admin.</p></div>
          <form onSubmit={submit}>
            <div className="feature-contact-fields">
              <label>Name<input value={form.name} onChange={(event) => updateForm('name', event.target.value)} minLength="2" maxLength="80" autoComplete="name" required placeholder="Your name" /></label>
              <label>Email<input type="email" value={form.email} onChange={(event) => updateForm('email', event.target.value)} maxLength="254" autoComplete="email" required placeholder="you@example.com" /></label>
            </div>
            <label>Feature title<input value={form.title} onChange={(event) => updateForm('title', event.target.value)} minLength="5" maxLength="120" required placeholder="What should Spotter add?" /></label>
            <label>Description<textarea value={form.description} onChange={(event) => updateForm('description', event.target.value)} minLength="10" maxLength="1200" rows="6" required placeholder="What problem would this solve? How should it work?" /></label>
            <label className="feature-honeypot" aria-hidden="true">Website<input value={form.website} onChange={(event) => updateForm('website', event.target.value)} tabIndex="-1" autoComplete="off" /></label>
            {error && <p className="form-error" role="alert">{error}</p>}
            {message && <p className="form-success" role="status">{message}</p>}
            <button className="primary-button" disabled={busy}>{busy ? 'Submittingâ€¦' : 'Submit for review'} <Send /></button>
          </form>
          <small>Request remains hidden until admin approves it.</small>
        </section>
      </div>
    </main>
  )
}
