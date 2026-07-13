import { ArrowRight, CalendarDays, Dumbbell, Flame, Target, Trophy } from 'lucide-react'
import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import MiniChart from '../components/MiniChart'
import ProgressRing from '../components/ProgressRing'
import { useData } from '../context/DataContext'

export default function Progress() {
  const navigate = useNavigate()
  const { categories, exercises, sessions, sets, records } = useData()
  const completed = sessions.filter((item) => item.ended_at)
  const stats = useMemo(() => {
    const months = Array.from({ length: 6 }, (_, index) => { const date = new Date(); date.setMonth(date.getMonth() - (5 - index), 1); date.setHours(0, 0, 0, 0); return date })
    const volume = months.map((month) => sets.filter((set) => { const date = new Date(set.created_at); return date.getFullYear() === month.getFullYear() && date.getMonth() === month.getMonth() }).reduce((sum, set) => sum + Number(set.weight) * Number(set.reps), 0))
    const totalVolume = sets.reduce((sum, set) => sum + Number(set.weight) * Number(set.reps), 0)
    const thisMonth = completed.filter((session) => { const date = new Date(session.started_at); const now = new Date(); return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear() })
    return { months, volume, totalVolume, thisMonth }
  }, [completed, sets])
  const activeCategories = categories.filter((item) => !item.is_archived)

  return (
    <main className="content-page progress-page">
      <header className="page-header"><div><span className="eyebrow">Performance analytics</span><h1>Progress</h1></div><span className="header-badge"><Target /></span></header>
      <section className="progress-hero glass-card"><div><span className="eyebrow">Total training volume</span><h2>{Math.round(stats.totalVolume).toLocaleString()} <small>kg</small></h2><p>Across {completed.length} completed sessions</p></div><ProgressRing value={Math.min(100, stats.thisMonth.length / 12 * 100)} size={90} label={`${stats.thisMonth.length}`} /></section>

      <section className="section-block"><div className="section-heading"><div><span className="eyebrow">Six month trend</span><h2>Volume over time</h2></div></div><div className="glass-card chart-card large"><MiniChart values={stats.volume} labels={stats.months.map((date) => date.toLocaleDateString(undefined, { month: 'short' }))} format={(value) => `${Math.round(value / 1000)}k`} /></div></section>

      <section className="section-block"><div className="section-heading"><div><span className="eyebrow">Training balance</span><h2>Category frequency</h2></div></div><div className="goal-list">{activeCategories.map((category, index) => { const count = completed.filter((session) => session.category_id === category.id).length; const exerciseCount = exercises.filter((item) => !item.is_archived && item.category_id === category.id).length; const percent = completed.length ? count / completed.length * 100 : 0; return <div className="glass-card goal-row" key={category.id}><span className={`goal-icon tone-${index % 4}`}><Dumbbell /></span><span className="goal-copy"><strong>{category.name}</strong><small>{count} sessions · {exerciseCount} exercises</small></span><ProgressRing value={percent} size={56} /></div> })}</div></section>

      <section className="section-block"><div className="section-heading"><div><span className="eyebrow">Personal bests</span><h2>Record board</h2></div><span className="count-pill">{records.length}</span></div><div className="history-list">{[...records].sort((a, b) => b.best_est_1rm - a.best_est_1rm).map((record, index) => { const exercise = exercises.find((item) => item.id === record.exercise_id); return <button className="glass-card history-row" key={record.exercise_id} onClick={() => navigate(`/exercise/${record.exercise_id}`)}><span className={`record-rank ${index < 3 ? 'top' : ''}`}>{index < 3 ? <Trophy /> : String(index + 1).padStart(2, '0')}</span><span><strong>{exercise?.name || 'Archived exercise'}</strong><small>{new Date(record.achieved_at).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}</small></span><span className="metric">{Number(record.best_weight).toLocaleString()}<small>{exercise?.unit || 'kg'}</small></span><ArrowRight /></button> })}{!records.length && <div className="empty-state glass-card"><Trophy /><h3>Your record board is empty</h3><p>Complete a set to claim your first PR.</p></div>}</div></section>
      <section className="quick-stats"><div className="glass-card"><CalendarDays /><span><small>Sessions</small><strong>{completed.length}</strong></span></div><div className="glass-card"><Flame /><span><small>This month</small><strong>{stats.thisMonth.length}</strong></span></div><div className="glass-card"><Trophy /><span><small>Records</small><strong>{records.length}</strong></span></div></section>
    </main>
  )
}
