import { ArrowLeft, CalendarDays, Dumbbell, Trophy } from 'lucide-react'
import { useMemo } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import MiniChart from '../components/MiniChart'
import { useData } from '../context/DataContext'

export default function ExerciseHistory() {
  const { exerciseId } = useParams()
  const navigate = useNavigate()
  const { exercises, categories, sessions, sets, records } = useData()
  const exercise = exercises.find((item) => item.id === exerciseId)
  const category = categories.find((item) => item.id === exercise?.category_id)
  const record = records.find((item) => item.exercise_id === exerciseId)
  const exerciseSets = useMemo(() => sets.filter((item) => item.exercise_id === exerciseId).sort((a, b) => new Date(a.created_at) - new Date(b.created_at)), [exerciseId, sets])
  const grouped = useMemo(() => [...new Set(exerciseSets.map((item) => item.session_id))].map((sessionId) => ({ session: sessions.find((item) => item.id === sessionId), sets: exerciseSets.filter((item) => item.session_id === sessionId) })).sort((a, b) => new Date(b.session?.started_at) - new Date(a.session?.started_at)), [exerciseSets, sessions])
  const chartItems = grouped.slice(0, 8).reverse()

  if (!exercise) return <main className="content-page"><div className="empty-state glass-card"><Dumbbell /><h2>Exercise not found</h2><button className="secondary-button" onClick={() => navigate('/discover')}>Back to library</button></div></main>

  return (
    <main className="content-page history-page">
      <header className="page-header compact-header"><button className="icon-button" onClick={() => navigate(-1)}><ArrowLeft /></button><div><span className="eyebrow">{category?.name || 'Archived'}</span><h1>{exercise.name}</h1></div><span /></header>
      <section className="record-hero glass-card"><span className="record-medal"><Trophy /></span><div><span className="eyebrow">Current personal record</span><h2>{record ? Number(record.best_weight).toLocaleString() : '—'} <small>{exercise.unit}</small></h2><p>{record ? `Estimated 1RM ${Number(record.best_est_1rm).toFixed(1)} ${exercise.unit}` : 'Log a set to establish your baseline.'}</p></div></section>
      <section className="section-block"><div className="section-heading"><div><span className="eyebrow">Best set per session</span><h2>Strength trend</h2></div></div><div className="glass-card chart-card large">{chartItems.length ? <MiniChart values={chartItems.map((group) => Math.max(...group.sets.map((set) => Number(set.weight))))} labels={chartItems.map((group) => new Date(group.session?.started_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }))} format={(value) => `${value}${exercise.unit}`} /> : <div className="empty-chart">Not enough data yet</div>}</div></section>
      <section className="section-block"><div className="section-heading"><div><span className="eyebrow">All working sets</span><h2>Session history</h2></div><span className="count-pill">{exerciseSets.length}</span></div><div className="session-history">{grouped.map((group) => <article className="glass-card history-session" key={group.session?.id}><header><span><CalendarDays />{new Date(group.session?.started_at).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' })}</span><small>{group.sets.length} sets</small></header>{group.sets.map((set) => <div className="history-set" key={set.id}><span>SET {String(set.set_number).padStart(2, '0')}</span><strong>{Number(set.weight).toLocaleString()} <small>{exercise.unit}</small></strong><span>×</span><strong>{set.reps} <small>{exercise.unit === 'seconds' ? 'sec' : 'reps'}</small></strong>{set.is_pr && <span className="pr-chip"><Trophy /> PR</span>}</div>)}</article>)}{!grouped.length && <div className="empty-state glass-card"><Dumbbell /><h3>No set history</h3><p>Add this exercise to your next workout.</p></div>}</div></section>
    </main>
  )
}
