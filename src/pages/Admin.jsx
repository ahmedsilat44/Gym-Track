import { ArrowLeft, Check, Clock3, RefreshCw, Search, ShieldCheck, UserRoundCheck, UserRoundX } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useNavigate } from '../router'

const filters = ['pending', 'approved', 'rejected', 'all']

export default function Admin() {
  const { user, listMembers, setMemberAccess } = useAuth()
  const navigate = useNavigate()
  const [members, setMembers] = useState([])
  const [filter, setFilter] = useState('pending')
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState('')
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try { setMembers(await listMembers()) }
    catch (caught) { setError(caught.message || 'Could not load members.') }
    finally { setLoading(false) }
  }, [listMembers])

  useEffect(() => { load() }, [load])

  const counts = useMemo(() => filters.reduce((result, status) => ({
    ...result,
    [status]: status === 'all' ? members.length : members.filter((member) => member.access_status === status).length,
  }), {}), [members])

  const visibleMembers = useMemo(() => {
    const needle = query.trim().toLowerCase()
    return members.filter((member) => (filter === 'all' || member.access_status === filter)
      && (!needle || [member.email, member.display_name, member.username].some((value) => value?.toLowerCase().includes(needle))))
  }, [filter, members, query])

  const updateAccess = async (member, status) => {
    const destructive = status !== 'approved'
    if (destructive && !window.confirm(`${status === 'rejected' ? 'Reject' : 'Return'} ${member.display_name || member.email} ${status === 'rejected' ? 'and block app access' : 'to the waitlist'}?`)) return
    setBusyId(member.id)
    setError('')
    try {
      await setMemberAccess(member.id, status)
      await load()
    } catch (caught) {
      setError(caught.message || 'Could not update access.')
    } finally {
      setBusyId('')
    }
  }

  return (
    <main className="content-page admin-page">
      <header className="page-header compact-header">
        <button className="icon-button" onClick={() => navigate('/settings')} aria-label="Back to settings"><ArrowLeft /></button>
        <div><span className="eyebrow">Network control</span><h1>Admin console</h1></div>
        <span className="header-badge"><ShieldCheck /></span>
      </header>

      <section className="admin-summary">
        <div className="glass-card"><Clock3 /><span><strong>{counts.pending || 0}</strong><small>Pending</small></span></div>
        <div className="glass-card"><UserRoundCheck /><span><strong>{counts.approved || 0}</strong><small>Approved</small></span></div>
        <div className="glass-card"><UserRoundX /><span><strong>{counts.rejected || 0}</strong><small>Rejected</small></span></div>
      </section>

      <section className="admin-tools">
        <div className="admin-filters" role="tablist">{filters.map((status) => <button key={status} role="tab" aria-selected={filter === status} className={filter === status ? 'active' : ''} onClick={() => setFilter(status)}>{status}<span>{counts[status] || 0}</span></button>)}</div>
        <label className="search-box"><Search /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search name, username, or email" /></label>
      </section>

      {error && <div className="form-error admin-error" role="alert">{error}</div>}
      {loading ? <div className="admin-loading"><RefreshCw className="spin" /> Loading members…</div> : (
        <section className="admin-member-list">
          {visibleMembers.map((member) => {
            const ownAccount = member.id === user.id
            const busy = busyId === member.id
            return <article className="glass-card admin-member" key={member.id}>
              <span className="avatar small">{(member.display_name || member.email || '?').slice(0, 2).toUpperCase()}</span>
              <div className="admin-member-copy">
                <div><strong>{member.display_name || 'Unnamed athlete'}</strong>{member.is_admin && <span className="admin-badge">Admin</span>}</div>
                <small>@{member.username} · {member.email}</small>
                <small>Joined {new Date(member.created_at).toLocaleDateString()}</small>
              </div>
              <span className={`member-status ${member.access_status}`}>{member.access_status}</span>
              <div className="admin-member-actions">
                {member.access_status !== 'approved' && <button className="primary-button compact" disabled={busy} onClick={() => updateAccess(member, 'approved')}><Check /> Approve</button>}
                {member.access_status === 'approved' && !member.is_admin && <button className="secondary-button compact" disabled={busy || ownAccount} onClick={() => updateAccess(member, 'pending')}><Clock3 /> Waitlist</button>}
                {member.access_status !== 'rejected' && !member.is_admin && <button className="danger-button" disabled={busy || ownAccount} onClick={() => updateAccess(member, 'rejected')}><UserRoundX /> Reject</button>}
              </div>
            </article>
          })}
          {!visibleMembers.length && <div className="glass-card admin-empty">No matching members.</div>}
        </section>
      )}
    </main>
  )
}
