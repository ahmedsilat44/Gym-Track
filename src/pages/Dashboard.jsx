import { ArrowRight, Bell, CalendarDays, Dumbbell, Flame, Play, Trophy } from 'lucide-react'
import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import MiniChart from '../components/MiniChart'
import ProgressRing from '../components/ProgressRing'
import { useAuth } from '../context/AuthContext'
import { useData } from '../context/DataContext'

const startOfDay = (value) => { const date = new Date(value); date.setHours(0, 0, 0, 0); return date }
const formatWeight = (value) => Number(value).toLocaleString(undefined, { maximumFractionDigits: 1 })

export default function Dashboard() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { exercises, sessions, sets, records, preferences, loading, activeWorkout } = useData()
  const name = preferences.display_name || user.user_metadata?.display_name || user.email?.split('@')[0] || 'Athlete'

  const stats = useMemo(() => {
    const completed = sessions.filter((session) => session.ended_at)
    const today = startOfDay(new Date())
    const weekStart = new Date(today); weekStart.setDate(today.getDate() - ((today.getDay() + 6) % 7))
    const weekSessions = completed.filter((session) => new Date(session.started_at) >= weekStart)
    const uniqueDays = [...new Set(completed.map((session) => startOfDay(session.started_at).getTime()))].sort((a, b) => b - a)
    let streak = 0
    let cursor = today.getTime()
    if (uniqueDays.length && cursor - uniqueDays[0] <= 86400000) {
      for (const day of uniqueDays) {
        const difference = Math.round((cursor - day) / 86400000)
        if (difference <= 1) { streak += 1; cursor = day } else break
      }
    }
    const lastSeven = Array.from({ length: 7 }, (_, index) => { const day = new Date(today); day.setDate(today.getDate() - (6 - index)); return day })
    const volume = lastSeven.map((day) => sets.filter((set) => startOfDay(set.created_at).getTime() === day.getTime()).reduce((sum, set) => sum + Number(set.weight) * Number(set.reps), 0))
    const latest = completed[0]
    const latestSets = latest ? sets.filter((set) => set.session_id === latest.id) : []
    const activity = [...new Set(latestSets.map((set) => set.exercise_id))].map((id) => {
      const exerciseSets = latestSets.filter((set) => set.exercise_id === id)
      return { exercise: exercises.find((item) => item.id === id), sets: exerciseSets.length, best: Math.max(...exerciseSets.map((item) => Number(item.weight))) }
    })
    return { completed, weekSessions, streak, volume, lastSeven, activity, latest }
  }, [exercises, sessions, sets])

  const recentRecords = [...records].sort((a, b) => new Date(b.achieved_at) - new Date(a.achieved_at)).slice(0, 3)
  if (loading) return <div className="page-loading">Loading your performance…</div>

  return (
    <main className="content-page dashboard-page">
      <header className="profile-header">
        <button className="profile-identity" onClick={() => navigate(`/profile/${user.id}`)} aria-label="Open your profile"><span className="avatar">{name.slice(0, 2).toUpperCase()}</span><span className="profile-copy"><span className="eyebrow">Welcome back</span><h1>{name} <span className="wave">↗</span></h1></span></button>
        <button className="notification-button" aria-label="Notifications"><Bell /><span>{recentRecords.length}</span></button>
      </header>

      <section className="hero-card glass-card">
        <div className="hero-card-copy">
          <span className="eyebrow">This week</span>
          <h2>{stats.weekSessions.length ? 'Momentum is building.' : 'Ready when you are.'}</h2>
          <p>{stats.weekSessions.length} sessions complete · {stats.streak} day streak</p>
          <button className="primary-button compact" onClick={() => navigate(activeWorkout ? '/session' : '/start')}><Play size={18} fill="currentColor" />{activeWorkout ? 'Resume workout' : 'Start workout'}</button>
        </div>
        <ProgressRing value={Math.min(100, stats.weekSessions.length / 4 * 100)} size={92} label={`${stats.weekSessions.length}/4`} />
      </section>

      <div className="dashboard-grid">
        <section className="section-block activity-section">
          <div className="section-heading"><div><span className="eyebrow">Latest session</span><h2>Recent activity</h2></div><button onClick={() => navigate('/progress')}>See all <ArrowRight size={16} /></button></div>
          <div className="glass-card activity-card">
            {stats.activity.length ? stats.activity.slice(0, 4).map(({ exercise, sets: setCount, best }, index) => (
              <button className="activity-row" key={exercise?.id || index} onClick={() => exercise && navigate(`/exercise/${exercise.id}`)}>
                <span className={`activity-dot tone-${index % 4}`} /><span className="activity-name"><strong>{exercise?.name || 'Archived exercise'}</strong><small>{setCount} sets completed</small></span><span className="metric">{formatWeight(best)}<small>{exercise?.unit || preferences.unit}</small></span>
              </button>
            )) : <div className="empty-state"><Dumbbell /><h3>No sessions yet</h3><p>Your completed exercises will show up here.</p></div>}
          </div>
        </section>

        <section className="section-block volume-section">
          <div className="section-heading"><div><span className="eyebrow">Training load</span><h2>7-day volume</h2></div></div>
          <div className="glass-card chart-card"><MiniChart values={stats.volume} labels={stats.lastSeven.map((date) => date.toLocaleDateString(undefined, { weekday: 'narrow' }))} format={(value) => `${Math.round(value / 1000)}k`} /></div>
        </section>
      </div>

      <section className="section-block">
        <div className="section-heading"><div><span className="eyebrow">Breakthroughs</span><h2>Personal records</h2></div><button onClick={() => navigate('/progress')}>View progress <ArrowRight size={16} /></button></div>
        <div className="record-grid">
          {recentRecords.length ? recentRecords.map((record, index) => {
            const exercise = exercises.find((item) => item.id === record.exercise_id)
            return <button className="glass-card record-card" key={record.exercise_id} onClick={() => navigate(`/exercise/${record.exercise_id}`)}><span className={`record-icon tone-${index}`}><Trophy size={20} /></span><span><small>{exercise?.name}</small><strong>{formatWeight(record.best_weight)} <em>{exercise?.unit}</em></strong><small>Est. 1RM {formatWeight(record.best_est_1rm)}</small></span></button>
          }) : <div className="glass-card empty-record"><Trophy /><p>Log your first working set to establish a baseline PR.</p></div>}
        </div>
      </section>

      <section className="quick-stats">
        <div className="glass-card"><CalendarDays /><span><small>Total sessions</small><strong>{stats.completed.length}</strong></span></div>
        <div className="glass-card"><Flame /><span><small>Current streak</small><strong>{stats.streak} days</strong></span></div>
        <div className="glass-card"><Dumbbell /><span><small>Active exercises</small><strong>{exercises.filter((item) => !item.is_archived).length}</strong></span></div>
      </section>
    </main>
  )
}
