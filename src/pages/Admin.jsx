import { Activity, ArrowLeft, CalendarDays, Check, Clock3, Database, Dumbbell, RefreshCw, Search, ShieldCheck, UserRoundCheck, UserRoundX } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useNavigate } from '../router'

const filters = ['pending', 'approved', 'rejected', 'all']

const lastActiveLabel = (value) => {
  if (!value) return 'No tracked activity'
  const date = new Date(value)
  const elapsedDays = Math.floor((Date.now() - date.getTime()) / 86400000)
  if (elapsedDays <= 0) return 'Active today'
  if (elapsedDays === 1) return 'Active yesterday'
  if (elapsedDays < 30) return `Active ${elapsedDays} days ago`
  return `Last active ${date.toLocaleDateString()}`
}

export default function Admin() {
  const { user, listMembers, listMemberAnalytics, setMemberAccess } = useAuth()
  const navigate = useNavigate()
  const [members, setMembers] = useState([])
  const [filter, setFilter] = useState('pending')
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState('')
  const [error, setError] = useState('')
  const [analyticsWarning, setAnalyticsWarning] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    setAnalyticsWarning('')
    try {
      const memberRows = await listMembers()
      let analyticsRows = []
      try { analyticsRows = await listMemberAnalytics() }
      catch { setAnalyticsWarning('Usage analytics unavailable. Apply latest Supabase migration to enable tracking.') }
      const analyticsByUser = new Map(analyticsRows.map((row) => [row.user_id, row]))
      setMembers(memberRows.map((member) => ({ ...member, ...analyticsByUser.get(member.id) })))
    }
    catch (caught) { setError(caught.message || 'Could not load members.') }
    finally { setLoading(false) }
  }, [listMemberAnalytics, listMembers])

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

  const analytics = useMemo(() => {
    const activeMembers = members.filter((member) => Number(member.active_days_30 || 0) > 0).length
    const workouts30 = members.reduce((sum, member) => sum + Number(member.workouts_30 || 0), 0)
    const requests30 = members.reduce((sum, member) => sum + Number(member.database_requests_30 || 0), 0)
    const activeDays30 = members.reduce((sum, member) => sum + Number(member.active_days_30 || 0), 0)
    return { activeMembers, workouts30, requests30, requestsPerActiveDay: activeDays30 ? (requests30 / activeDays30).toFixed(1) : '0' }
  }, [members])

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

      <section className="admin-analytics-section">
        <div className="section-heading"><div><span className="eyebrow">Last 30 days</span><h2>Network analytics</h2></div></div>
        <div className="admin-analytics-summary">
          <div className="glass-card"><Activity /><span><strong>{analytics.activeMembers}</strong><small>Active members</small></span></div>
          <div className="glass-card"><Dumbbell /><span><strong>{analytics.workouts30}</strong><small>Workouts</small></span></div>
          <div className="glass-card"><Database /><span><strong>{analytics.requests30.toLocaleString()}</strong><small>DB requests</small></span></div>
          <div className="glass-card"><CalendarDays /><span><strong>{analytics.requestsPerActiveDay}</strong><small>Requests / active day</small></span></div>
        </div>
        <p className="admin-analytics-note">DB requests count Supabase database API calls, not internal PostgreSQL statements. Daily totals contain no query text, payloads, routes, IP addresses, or device data.</p>
      </section>

      <section className="admin-tools">
        <div className="admin-filters" role="tablist">{filters.map((status) => <button key={status} role="tab" aria-selected={filter === status} className={filter === status ? 'active' : ''} onClick={() => setFilter(status)}>{status}<span>{counts[status] || 0}</span></button>)}</div>
        <label className="search-box"><Search /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search name, username, or email" /></label>
      </section>

      {error && <div className="form-error admin-error" role="alert">{error}</div>}
      {analyticsWarning && <div className="form-error admin-error" role="status">{analyticsWarning}</div>}
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
                <small className="admin-last-active">{lastActiveLabel(member.last_active_at)}</small>
              </div>
              <span className={`member-status ${member.access_status}`}>{member.access_status}</span>
              <div className="admin-member-actions">
                {member.access_status !== 'approved' && <button className="primary-button compact" disabled={busy} onClick={() => updateAccess(member, 'approved')}><Check /> Approve</button>}
                {member.access_status === 'approved' && !member.is_admin && <button className="secondary-button compact" disabled={busy || ownAccount} onClick={() => updateAccess(member, 'pending')}><Clock3 /> Waitlist</button>}
                {member.access_status !== 'rejected' && !member.is_admin && <button className="danger-button" disabled={busy || ownAccount} onClick={() => updateAccess(member, 'rejected')}><UserRoundX /> Reject</button>}
              </div>
              <div className="admin-member-analytics">
                <span><Activity /><strong>{member.active_days_30 || 0}</strong><small>Active days / 30</small></span>
                <span><Dumbbell /><strong>{member.workouts_total || 0}</strong><small>Workouts · {member.workouts_30 || 0} recent</small></span>
                <span><CalendarDays /><strong>{member.routines_total || 0}</strong><small>Routines · {member.routines_30 || 0} recent</small></span>
                <span><Database /><strong>{Number(member.avg_database_requests_per_active_day || 0).toFixed(1)} / day</strong><small>{Number(member.database_requests_30 || 0).toLocaleString()} DB requests · 30 days</small></span>
              </div>
            </article>
          })}
          {!visibleMembers.length && <div className="glass-card admin-empty">No matching members.</div>}
        </section>
      )}
    </main>
  )
}
