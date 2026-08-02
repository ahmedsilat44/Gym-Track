import { Clock3, LogOut, RefreshCw, ShieldAlert } from 'lucide-react'
import { useState } from 'react'
import { useAuth } from '../context/AuthContext'

export default function PendingAccess() {
  const { user, accessStatus, membershipError, refreshMembership, signOut } = useAuth()
  const [busy, setBusy] = useState(false)

  const refresh = async () => {
    setBusy(true)
    await refreshMembership()
    setBusy(false)
  }

  const rejected = accessStatus === 'rejected'
  const setupError = Boolean(membershipError)

  return (
    <main className="access-page">
      <section className="glass-card access-card">
        <span className={`access-icon ${rejected || setupError ? 'denied' : ''}`}>
          {rejected || setupError ? <ShieldAlert /> : <Clock3 />}
        </span>
        <p className="eyebrow">Private training network</p>
        <h1>{setupError ? 'Approval system unavailable' : rejected ? 'Access not approved' : 'Approval pending'}</h1>
        <p>{setupError
          ? 'This installation has not finished its admin approval setup. Ask the owner to apply the latest Supabase migration.'
          : rejected
            ? 'An administrator declined or revoked this account. Contact the network owner if this was unexpected.'
            : 'Account created. An administrator must approve it before workout or social data can load.'}</p>
        <small>{user?.email}</small>
        {membershipError && <div className="form-error" role="alert">{membershipError}</div>}
        <div className="access-actions">
          <button className="primary-button" onClick={refresh} disabled={busy}><RefreshCw className={busy ? 'spin' : ''} /> {busy ? 'Checking…' : 'Check status'}</button>
          <button className="secondary-button" onClick={signOut}><LogOut /> Sign out</button>
        </div>
      </section>
    </main>
  )
}
