import { ArrowRight, Check, KeyRound, LockKeyhole, LogOut } from 'lucide-react'
import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useNavigate } from '../router'

export default function PasswordReset() {
  const { updatePassword, clearPasswordRecovery, signOut } = useAuth()
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [saved, setSaved] = useState(false)

  const submit = async (event) => {
    event.preventDefault()
    setError('')
    if (password.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }
    if (password !== confirmation) {
      setError('Passwords do not match.')
      return
    }
    setBusy(true)
    try {
      await updatePassword(password)
      setSaved(true)
      window.setTimeout(() => {
        clearPasswordRecovery()
        navigate('/')
      }, 900)
    } catch (caught) {
      setError(caught.message || 'Could not update password.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="access-page">
      <section className="glass-card access-card password-reset-card">
        <span className="access-icon"><KeyRound /></span>
        <p className="eyebrow">Spotter account</p>
        <h1>{saved ? 'Password updated' : 'Choose new password'}</h1>
        <p>{saved ? 'Password changed. Returning to your training dashboard.' : 'Use a strong password you do not reuse elsewhere.'}</p>
        {!saved && <form className="password-reset-form" onSubmit={submit}>
          <label>New password<div className="input-with-icon"><LockKeyhole size={18} /><input type="password" minLength="8" autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} required placeholder="At least 8 characters" /></div></label>
          <label>Confirm password<div className="input-with-icon"><LockKeyhole size={18} /><input type="password" minLength="8" autoComplete="new-password" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} required placeholder="Repeat new password" /></div></label>
          {error && <p className="form-error" role="alert">{error}</p>}
          <button className="primary-button" disabled={busy}>{busy ? 'Saving…' : 'Save password'} {saved ? <Check size={19} /> : <ArrowRight size={19} />}</button>
        </form>}
        <button className="text-button" onClick={signOut}><LogOut size={16} /> Cancel and sign out</button>
      </section>
    </main>
  )
}
