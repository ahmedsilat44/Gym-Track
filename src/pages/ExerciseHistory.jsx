import { ArrowLeft, CalendarDays, Dumbbell, Trophy } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from '../router'
import LineChart from '../components/LineChart'
import { useData } from '../context/DataContext'

const setVolume = (set) => Number(set.weight || 0) * Number(set.reps || 0)
const formatNumber = (value, digits = 1) => Number(value).toLocaleString(undefined, { maximumFractionDigits: digits })

export default function ExerciseHistory() {
  const { exerciseId } = useParams()
  const navigate = useNavigate()
  const { exercises, categories, sessions, sets, sessionRecords, records, loading } = useData()
  const exercise = exercises.find((item) => item.id === exerciseId)
  const category = categories.find((item) => item.id === exercise?.category_id)
  const record = records.find((item) => item.exercise_id === exerciseId)
  const bodyweight = exercise?.is_bodyweight || ['reps', 'seconds'].includes(exercise?.unit)
  const defaultMetric = bodyweight ? 'reps' : 'weight'
  const [activeMetric, setActiveMetric] = useState(defaultMetric)

  useEffect(() => setActiveMetric(defaultMetric), [defaultMetric, exerciseId])

  const exerciseSets = useMemo(() => sets
    .filter((item) => item.exercise_id === exerciseId)
    .sort((a, b) => new Date(a.created_at) - new Date(b.created_at)), [exerciseId, sets])
  const exerciseRecords = useMemo(() => sessionRecords
    .filter((item) => item.exercise_id === exerciseId)
    .sort((a, b) => new Date(a.recorded_at) - new Date(b.recorded_at)), [exerciseId, sessionRecords])
  const grouped = useMemo(() => [...new Set(exerciseSets.map((item) => item.session_id))]
    .map((sessionId) => ({ session: sessions.find((item) => item.id === sessionId), sets: exerciseSets.filter((item) => item.session_id === sessionId) }))
    .filter((group) => group.session)
    .sort((a, b) => new Date(a.session.started_at) - new Date(b.session.started_at)), [exerciseSets, sessions])

  const metricOptions = useMemo(() => {
    const permanentPoints = (field) => exerciseRecords.map((item) => ({ date: item.recorded_at, value: Number(item[field]) }))
    const rawPoints = (calculate) => grouped.map((group) => ({ date: group.session.started_at, value: calculate(group.sets) }))
    const repLabel = exercise?.unit === 'seconds' ? 'Longest duration' : 'Most reps'
    const repUnit = exercise?.unit === 'seconds' ? 'sec' : 'reps'
    const volumeUnit = `${exercise?.unit || 'kg'} vol`
    return [
      { id: 'weight', label: 'Heaviest weight', shortLabel: 'Weight', scope: 'Permanent', unit: exercise?.unit || 'kg', points: permanentPoints('best_weight'), summary: Number(record?.best_weight || 0) },
      { id: 'oneRm', label: 'Estimated 1RM', shortLabel: 'Est. 1RM', scope: 'Permanent', unit: exercise?.unit || 'kg', points: permanentPoints('best_est_1rm'), summary: Number(record?.best_est_1rm || 0) },
      { id: 'setVolume', label: 'Best set volume', shortLabel: 'Set volume', scope: '3 months', unit: volumeUnit, points: rawPoints((sessionSets) => Math.max(...sessionSets.map(setVolume), 0)), summary: Math.max(...exerciseSets.map(setVolume), 0) },
      { id: 'sessionVolume', label: 'Best session volume', shortLabel: 'Session volume', scope: '3 months', unit: volumeUnit, points: rawPoints((sessionSets) => sessionSets.reduce((total, set) => total + setVolume(set), 0)), summary: Math.max(...grouped.map((group) => group.sets.reduce((total, set) => total + setVolume(set), 0)), 0) },
      { id: 'reps', label: repLabel, shortLabel: exercise?.unit === 'seconds' ? 'Duration' : 'Most reps', scope: '3 months', unit: repUnit, points: rawPoints((sessionSets) => Math.max(...sessionSets.map((set) => Number(set.reps)), 0)), summary: Math.max(...exerciseSets.map((set) => Number(set.reps)), 0) },
    ]
  }, [exercise?.unit, exerciseRecords, exerciseSets, grouped, record])

  const selectedMetric = metricOptions.find((metric) => metric.id === activeMetric) || metricOptions[0]
  const selectedBest = Math.max(...selectedMetric.points.map((point) => point.value), 0)
  const recentGroups = [...grouped].reverse()

  if (loading) return <div className="page-loading">Loading exercise history…</div>
  if (!exercise) return <main className="content-page"><div className="empty-state glass-card"><Dumbbell /><h2>Exercise not found</h2><button className="secondary-button" onClick={() => navigate('/discover')}>Back to library</button></div></main>

  return (
    <main className="content-page history-page exercise-detail-page">
      <header className="exercise-detail-header">
        <button className="icon-button" onClick={() => navigate(-1)} aria-label="Go back"><ArrowLeft /></button>
        <div><h1>{exercise.name}</h1><p>{category?.name || 'Uncategorized'} · {exercise.exercise_type || 'Strength'}</p></div>
      </header>

      <section className="exercise-chart-section" aria-labelledby="exercise-progress-heading">
        <div className="exercise-chart-summary">
          <div><h2 id="exercise-progress-heading">Progress over time</h2><p>{selectedMetric.label} · {selectedMetric.scope.toLowerCase()}</p></div>
          <strong>{selectedMetric.points.length ? formatNumber(selectedBest) : '—'} <small>{selectedMetric.unit}</small></strong>
        </div>
        <div className="exercise-line-chart">
          {selectedMetric.points.length ? <LineChart
            values={selectedMetric.points.map((point) => point.value)}
            labels={selectedMetric.points.map((point) => new Date(point.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }))}
            formatTick={(value) => formatNumber(value)}
            ariaLabel={`${selectedMetric.label} over time: ${selectedMetric.points.map((point) => `${new Date(point.date).toLocaleDateString()} ${formatNumber(point.value)} ${selectedMetric.unit}`).join(', ')}`}
          /> : <div className="empty-chart">No data for this metric yet</div>}
        </div>
        <div className="exercise-metric-tabs" role="group" aria-label="Chart metric">
          {metricOptions.map((metric) => <button className={activeMetric === metric.id ? 'active' : ''} key={metric.id} onClick={() => setActiveMetric(metric.id)} aria-pressed={activeMetric === metric.id}>{metric.shortLabel}</button>)}
        </div>
      </section>

      <section className="section-block exercise-records-section">
        <div className="section-heading exercise-detail-heading"><div><h2>Personal records</h2><p>Permanent strength bests and recent detailed-set peaks.</p></div><Trophy /></div>
        <dl className="exercise-record-list">
          {metricOptions.map((metric) => <div key={metric.id}><dt><span>{metric.label}</span><small>{metric.scope}</small></dt><dd>{metric.summary ? formatNumber(metric.summary) : '—'} <small>{metric.unit}</small></dd></div>)}
        </dl>
      </section>

      <section className="section-block">
        <div className="section-heading exercise-detail-heading"><div><h2>Detailed history</h2><p>Raw working sets from the last three months.</p></div><span className="count-pill">{exerciseSets.length}</span></div>
        <p className="form-note">Session bests and estimated 1RM remain permanent after detailed sets expire.</p>
        <div className="session-history">
          {recentGroups.map((group) => <article className="history-session" key={group.session.id}><header><span><CalendarDays />{new Date(group.session.started_at).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' })}</span><small>{group.sets.length} sets</small></header>{group.sets.map((set) => <div className="history-set" key={set.id}><span>SET {String(set.set_number).padStart(2, '0')}</span><strong>{formatNumber(set.weight)} <small>{exercise.unit}</small></strong><span>×</span><strong>{set.reps} <small>{exercise.unit === 'seconds' ? 'sec' : 'reps'}</small></strong>{set.is_pr && <span className="pr-chip"><Trophy /> PR</span>}</div>)}</article>)}
          {!recentGroups.length && <div className="empty-state exercise-history-empty"><Dumbbell /><h3>No recent set details</h3><p>{exerciseRecords.length ? 'Older session bests remain in the progress graph.' : 'Add this exercise to your next workout.'}</p></div>}
        </div>
      </section>
    </main>
  )
}
