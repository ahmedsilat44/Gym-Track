import { Activity, ArrowRight, CheckCircle2, Lightbulb, LockKeyhole, Mail } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { featureStatusLabel, listPublicFeatureRequests } from '../lib/featureRequests'
import { useNavigate } from '../router'

export default function Login() {
  const { signIn, signUp, requestPasswordReset } = useAuth()
  const navigate = useNavigate()
  const allowSignup = import.meta.env.VITE_ALLOW_SIGNUP !== 'false'
  const [mode, setMode] = useState('signin')
  const [form, setForm] = useState({ name: '', email: '', password: '' })
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const [featurePreview, setFeaturePreview] = useState([])
  const [featurePreviewLoading, setFeaturePreviewLoading] = useState(true)
  const [featurePreviewError, setFeaturePreviewError] = useState('')

  useEffect(() => {
    let active = true
    listPublicFeatureRequests()
      .then((items) => { if (active) setFeaturePreview(items.slice(0, 3)) })
      .catch(() => { if (active) setFeaturePreviewError('Feature preview could not load.') })
      .finally(() => { if (active) setFeaturePreviewLoading(false) })
    return () => { active = false }
  }, [])

  const submit = async (event) => {
    event.preventDefault()
    setBusy(true)
    setError('')
    setMessage('')
    try {
      if (mode === 'reset') {
        await requestPasswordReset(form.email)
        setMessage('If account exists, reset email is on its way. Check spam too.')
      } else if (mode === 'signin') await signIn(form.email, form.password)
      else if (allowSignup) {
        await signUp(form.email, form.password, form.name)
        setMessage('Request received. Confirm your email, then sign in to check admin approval.')
        setMode('signin')
      }
    } catch (caught) {
      setError(caught.message || 'Authentication failed.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="login-page">
      <section className="login-hero">
        <div className="brand-mark"><Activity /></div>
        <p className="eyebrow">Spotter</p>
        <h1>Every rep.<br /><span>Measured.</span></h1>
        <p>Train with intent, capture every set, and turn consistency into measurable progress.</p>
        <div className="hero-grid" aria-hidden="true"><i /><i /><i /><i /><i /></div>
      </section>
      <section className="login-card glass-card">
        <div><p className="eyebrow">Athlete access</p><h2>{mode === 'signin' ? 'Welcome back' : mode === 'reset' ? 'Reset password' : 'Join the waitlist'}</h2></div>
        <form onSubmit={submit}>
          {mode === 'signup' && <label>Display name<input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required placeholder="How should we call you?" /></label>}
          <label>Email<div className="input-with-icon"><Mail size={18} /><input type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} required placeholder="you@example.com" /></div></label>
          {mode !== 'reset' && <label>Password<div className="input-with-icon"><LockKeyhole size={18} /><input type="password" minLength="8" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} required placeholder="At least 8 characters" /></div></label>}
          {error && <p className="form-error">{error}</p>}
          {message && <p className="form-success">{message}</p>}
          <button className="primary-button" disabled={busy}>{busy ? 'Please wait…' : mode === 'signin' ? 'Sign in' : mode === 'reset' ? 'Send reset email' : 'Request access'} <ArrowRight size={19} /></button>
        </form>
        {mode === 'signin' && <button className="text-button login-reset-link" onClick={() => { setMode('reset'); setError(''); setMessage('') }}>Forgot password?</button>}
        {mode === 'reset' && <button className="text-button" onClick={() => { setMode('signin'); setError(''); setMessage('') }}>Back to sign in</button>}
        {allowSignup && mode !== 'reset' && <button className="text-button" onClick={() => setMode(mode === 'signin' ? 'signup' : 'signin')}>{mode === 'signin' ? 'New here? Join the waitlist' : 'Already have an account? Sign in'}</button>}
        {!allowSignup && <p className="form-note">This is a private training network. Ask its owner for an invitation.</p>}
      </section>
      <section className="login-feature-board" aria-labelledby="login-feature-title">
        <div className="login-feature-heading">
          <div><span><Lightbulb /></span><div><h2 id="login-feature-title">Built with community</h2><p>View approved ideas or request what Spotter should build next.</p></div></div>
          <button className="secondary-button compact" onClick={() => navigate('/features')}>Open feature board <ArrowRight /></button>
        </div>
        <div className="login-feature-preview">
          {featurePreviewLoading && <div className="login-feature-state" role="status"><Lightbulb /><span><strong>Loading feature boardâ€¦</strong><small>Checking approved community requests.</small></span></div>}
          {featurePreview.map((request) => <article key={request.id}><span className={`feature-status ${request.status}`}>{request.status === 'completed' && <CheckCircle2 />}{featureStatusLabel(request.status)}</span><h3>{request.title}</h3><p>{request.description}</p></article>)}
          {!featurePreviewLoading && featurePreviewError && <button className="login-feature-empty" onClick={() => navigate('/features')}><Lightbulb /><span><strong>{featurePreviewError}</strong><small>Open feature board and try again.</small></span><ArrowRight /></button>}
          {!featurePreviewLoading && !featurePreviewError && !featurePreview.length && <button className="login-feature-empty" onClick={() => navigate('/features')}><Lightbulb /><span><strong>Feature board is ready.</strong><small>View requests or send first idea.</small></span><ArrowRight /></button>}
        </div>
      </section>
    </main>
  )
}
