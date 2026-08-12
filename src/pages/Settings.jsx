import { ChevronRight, Database, Download, Dumbbell, FolderCog, LogOut, RotateCcw, Settings as SettingsIcon, ShieldCheck, UserRound } from 'lucide-react'
import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useData } from '../context/DataContext'
import { useNavigate } from '../router'

const tabs = [['profile', UserRound, 'Profile'], ['library', Dumbbell, 'Library'], ['data', Database, 'Data']]

export default function Settings() {
  const { user, isDemo, isAdmin, signOut } = useAuth()
  const navigate = useNavigate()
  const { categories, exercises, sessions, sets, sessionRecords, preferences, profiles, saveProfile, resetDemo } = useData()
  const [tab, setTab] = useState('profile')
  const [notice, setNotice] = useState('')
  const socialProfile = profiles.find((item) => item.id === user.id)
  const tell = (message) => { setNotice(message); window.setTimeout(() => setNotice(''), 2500) }
  const perform = async (action, message) => { try { await action(); tell(message) } catch (caught) { tell(caught.message || 'Something went wrong.') } }
  const exportCsv = () => {
    const header = ['row_type', 'session_started_at', 'session_ended_at', 'category', 'exercise', 'set_number', 'weight', 'unit', 'reps', 'estimated_1rm', 'is_pr', 'notes']
    const setRows = sets.map((set) => {
      const session = sessions.find((item) => item.id === set.session_id); const exercise = exercises.find((item) => item.id === set.exercise_id); const category = categories.find((item) => item.id === session?.category_id)
      return ['raw_set', session?.started_at, session?.ended_at, category?.name || 'Mixed / Unassigned', exercise?.name, set.set_number, set.weight, exercise?.unit, set.reps, '', set.is_pr, session?.notes]
    })
    const recordRows = sessionRecords.map((record) => {
      const session = sessions.find((item) => item.id === record.session_id); const exercise = exercises.find((item) => item.id === record.exercise_id); const category = categories.find((item) => item.id === session?.category_id)
      return ['permanent_session_best', session?.started_at || record.recorded_at, session?.ended_at, category?.name || 'Mixed / Unassigned', exercise?.name, '', record.best_weight, exercise?.unit, record.best_reps_at_weight, record.best_est_1rm, record.is_all_time_pr, session?.notes]
    })
    const csv = [header, ...setRows, ...recordRows].map((row) => row.map((value) => `"${String(value ?? '').replace(/^[=+\-@\t\r]/, "'$&").replaceAll('"', '""')}"`).join(',')).join('\n')
    const url = URL.createObjectURL(new Blob(['\ufeff', csv], { type: 'text/csv;charset=utf-8' })); const link = document.createElement('a'); link.href = url; link.download = `spotter-workouts-${new Date().toISOString().slice(0, 10)}.csv`; link.click(); URL.revokeObjectURL(url)
  }

  return <main className="content-page settings-page">
    <header className="page-header"><div><span className="eyebrow">Your training system</span><h1>Settings</h1></div><span className="header-badge"><SettingsIcon /></span></header>
    {notice && <div className="notice-toast" role="status">{notice}</div>}
    <div className="settings-tabs" role="group" aria-label="Settings sections">{tabs.map(([id, Icon, label]) => <button aria-pressed={tab === id} className={tab === id ? 'active' : ''} onClick={() => setTab(id)} key={id}><Icon /><span>{label}</span></button>)}</div>
    {tab === 'profile' && <section className="settings-panel"><div className="settings-title"><span className="eyebrow">Athlete preferences</span><h2>Profile & units</h2><p>Personalize your training and choose how friends find you on the social board.</p></div><form className="glass-card settings-form" onSubmit={(event) => { event.preventDefault(); const form = new FormData(event.currentTarget); perform(() => saveProfile({ display_name: form.get('display_name'), username: form.get('username'), bio: form.get('bio'), unit: form.get('unit') }), 'Profile saved.') }}><label>Display name<input name="display_name" defaultValue={preferences.display_name || user.user_metadata?.display_name || ''} /></label><label>Username<input name="username" required minLength="3" maxLength="30" pattern="[a-z0-9_]+" defaultValue={socialProfile?.username || ''} placeholder="your_username" /></label><label>Default weight unit<select name="unit" defaultValue={preferences.unit || 'kg'}><option value="kg">Kilograms (kg)</option><option value="lb">Pounds (lb)</option></select></label><label className="profile-bio">Social bio<textarea name="bio" maxLength="240" rows="3" defaultValue={socialProfile?.bio || ''} placeholder="Tell your training circle what you are working on." /></label><div className="form-note">Your name, username, and bio are discoverable to signed-in athletes. Workout history stays private unless you share a summary.</div><button className="primary-button compact">Save profile</button></form><div className="glass-card account-row"><span className="avatar small">{(preferences.display_name || user.email).slice(0, 2).toUpperCase()}</span><span><strong>{user.email}</strong><small>{isDemo ? 'Local demo athlete' : 'Supabase account'}</small></span>{!isDemo && <button className="danger-button" onClick={signOut}><LogOut /> Sign out</button>}</div>{isAdmin && <button className="glass-card data-action admin-entry" onClick={() => navigate('/admin')}><span className="data-icon"><ShieldCheck /></span><span><strong>Admin console</strong><small>Review waitlist requests and manage member access</small></span><ChevronRight /></button>}</section>}
    {tab === 'library' && <section className="settings-panel"><div className="settings-title"><h2>Exercise setup</h2><p>Manage movements and categories in focused spaces, without leaving your workout flow.</p></div><div className="settings-link-grid"><button className="glass-card settings-link-card" onClick={() => navigate('/exercises')}><span className="data-icon"><Dumbbell /></span><span><strong>Exercise library</strong><small>Create, edit, search, and assign exercises to categories.</small></span><ChevronRight /></button><button className="glass-card settings-link-card" onClick={() => navigate('/categories')}><span className="data-icon"><FolderCog /></span><span><strong>Categories</strong><small>Create, reorder, rename, or archive your workout split.</small></span><ChevronRight /></button></div></section>}
    {tab === 'data' && <section className="settings-panel"><div className="settings-title"><span className="eyebrow">Ownership & setup</span><h2>Your data</h2><p>Export your full training history or review the backend connection status.</p></div><button className="glass-card data-action" onClick={exportCsv}><span className="data-icon"><Download /></span><span><strong>Export workout history</strong><small>Download every logged set as a CSV file</small></span><ChevronRight /></button><div className={`glass-card connection-card ${isDemo ? 'demo' : 'connected'}`}><span className="status-dot" /><span><strong>{isDemo ? 'Local demo mode' : 'Supabase connected'}</strong><small>{isDemo ? 'Add VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY to use secure cloud sync.' : 'Authentication, persistent login, row-level security, and cloud sync are active.'}</small></span></div>{isDemo && <button className="secondary-button reset-button" onClick={() => window.confirm('Reset all local demo changes?') && (resetDemo(), tell('Demo data reset.'))}><RotateCcw /> Reset demo data</button>}</section>}
  </main>
}
