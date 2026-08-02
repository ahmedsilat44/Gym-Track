import { ArrowRight, CalendarDays, Dumbbell, Flame, Target, Trophy } from 'lucide-react'
import { useMemo } from 'react'
import { useNavigate } from '../router'
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
  const categoryFrequency = useMemo(() => {
    const completedIds = new Set(completed.map((session) => session.id))
    const exerciseCategories = new Map(exercises.map((exercise) => [exercise.id, exercise.category_id]))
    const sessionIdsByCategory = new Map(categories.filter((category) => !category.is_archived).map((category) => [category.id, new Set()]))
    sets.forEach((set) => {
      if (!completedIds.has(set.session_id)) return
      const categoryId = exerciseCategories.get(set.exercise_id)
      if (sessionIdsByCategory.has(categoryId)) sessionIdsByCategory.get(categoryId).add(set.session_id)
    })
    return categories.filter((category) => !category.is_archived).map((category) => ({
      ...category,
      sessionCount: sessionIdsByCategory.get(category.id)?.size ?? 0,
      exerciseCount: exercises.filter((exercise) => !exercise.is_archived && exercise.category_id === category.id).length,
    }))
  }, [categories, completed, exercises, sets])
  const recentPrs = useMemo(() => sets.filter((set) => set.is_pr).sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, 5), [sets])

  return (
    <main className="content-page progress-page">
      <header className="page-header"><div><span className="eyebrow">Performance analytics</span><h1>Progress</h1></div><span className="header-badge"><Target /></span></header>
      <section className="progress-hero glass-card"><div><span className="eyebrow">Total training volume</span><h2>{Math.round(stats.totalVolume).toLocaleString()} <small>kg</small></h2><p>Across {completed.length} completed sessions</p></div><ProgressRing value={Math.min(100, stats.thisMonth.length / 12 * 100)} size={90} label={`${stats.thisMonth.length}`} /></section>

      <section className="section-block"><div className="section-heading"><div><span className="eyebrow">Six month trend</span><h2>Volume over time</h2></div></div><div className="glass-card chart-card large"><MiniChart values={stats.volume} labels={stats.months.map((date) => date.toLocaleDateString(undefined, { month: 'short' }))} format={(value) => `${Math.round(value / 1000)}k`} /></div></section>

      <section className="section-block"><div className="section-heading"><div><span className="eyebrow">Training balance</span><h2>Category frequency</h2></div></div><div className="goal-list">{categoryFrequency.map((category, index) => { const percent = completed.length ? category.sessionCount / completed.length * 100 : 0; return <div className="glass-card goal-row" key={category.id}><span className={`goal-icon tone-${index % 4}`}><Dumbbell /></span><span className="goal-copy"><strong>{category.name}</strong><small>{category.sessionCount} sessions · {category.exerciseCount} exercises</small></span><ProgressRing value={percent} size={56} /></div> })}</div></section>

      <section className="section-block"><div className="section-heading"><div><span className="eyebrow">Latest breakthroughs</span><h2>Recent PRs</h2></div><button onClick={() => navigate('/records')}>All exercise PRs <ArrowRight /></button></div><div className="history-list">{recentPrs.map((set) => { const exercise = exercises.find((item) => item.id === set.exercise_id); const weightUnit = ['reps', 'seconds'].includes(exercise?.unit) ? 'kg' : exercise?.unit || 'kg'; return <button className="glass-card history-row" key={set.id} onClick={() => navigate(`/exercise/${set.exercise_id}`)}><span className="record-rank top"><Trophy /></span><span><strong>{exercise?.name || 'Archived exercise'}</strong><small>{new Date(set.created_at).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })} · {set.reps} {exercise?.unit === 'seconds' ? 'sec' : 'reps'}</small></span><span className="metric">{Number(set.weight).toLocaleString()}<small>{weightUnit}</small></span><ArrowRight /></button> })}{!recentPrs.length && <div className="empty-state glass-card"><Trophy /><h3>No recent PRs</h3><p>Complete a stronger set to add one here.</p></div>}</div></section>
      <section className="quick-stats"><div className="glass-card"><CalendarDays /><span><small>Sessions</small><strong>{completed.length}</strong></span></div><div className="glass-card"><Flame /><span><small>This month</small><strong>{stats.thisMonth.length}</strong></span></div><div className="glass-card"><Trophy /><span><small>Records</small><strong>{records.length}</strong></span></div></section>
    </main>
  )
}
