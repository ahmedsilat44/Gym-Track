import { Activity, ArrowRight, LockKeyhole, Mail } from 'lucide-react'
import { useState } from 'react'
import { useAuth } from '../context/AuthContext'

export default function Login() {
  const { signIn, signUp } = useAuth()
  const [mode, setMode] = useState('signin')
  const [form, setForm] = useState({ name: '', email: '', password: '' })
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async (event) => {
    event.preventDefault()
    setBusy(true)
    setError('')
    setMessage('')
    try {
      if (mode === 'signin') await signIn(form.email, form.password)
      else {
        await signUp(form.email, form.password, form.name)
        setMessage('Account created. Check your email if confirmation is enabled, then sign in.')
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
        <p className="eyebrow">Velocity Performance</p>
        <h1>Every rep.<br /><span>Measured.</span></h1>
        <p>Train with intent, capture every set, and turn consistency into measurable progress.</p>
        <div className="hero-grid" aria-hidden="true"><i /><i /><i /><i /><i /></div>
      </section>
      <section className="login-card glass-card">
        <div><p className="eyebrow">Athlete access</p><h2>{mode === 'signin' ? 'Welcome back' : 'Create your account'}</h2></div>
        <form onSubmit={submit}>
          {mode === 'signup' && <label>Display name<input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required placeholder="How should we call you?" /></label>}
          <label>Email<div className="input-with-icon"><Mail size={18} /><input type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} required placeholder="you@example.com" /></div></label>
          <label>Password<div className="input-with-icon"><LockKeyhole size={18} /><input type="password" minLength="6" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} required placeholder="At least 6 characters" /></div></label>
          {error && <p className="form-error">{error}</p>}
          {message && <p className="form-success">{message}</p>}
          <button className="primary-button" disabled={busy}>{busy ? 'Please wait…' : mode === 'signin' ? 'Sign in' : 'Create account'} <ArrowRight size={19} /></button>
        </form>
        <button className="text-button" onClick={() => setMode(mode === 'signin' ? 'signup' : 'signin')}>{mode === 'signin' ? 'New here? Create an account' : 'Already have an account? Sign in'}</button>
      </section>
    </main>
  )
}
