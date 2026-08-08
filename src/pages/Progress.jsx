import { ArrowRight, CalendarDays, Dumbbell, Flame, TrendingDown, TrendingUp, Trophy } from 'lucide-react'
import { useMemo } from 'react'
import { useNavigate } from '../router'
import MiniChart from '../components/MiniChart'
import { useData } from '../context/DataContext'

const startOfMonth = (value) => {
  const date = new Date(value)
  date.setDate(1)
  date.setHours(0, 0, 0, 0)
  return date
}

const setVolume = (set) => Number(set.weight || 0) * Number(set.reps || 0)

const formatVolume = (value) => Number(value).toLocaleString(undefined, { maximumFractionDigits: 0 })

export default function Progress() {
  const navigate = useNavigate()
  const { categories, exercises, sessions, sets, sessionRecords, records, preferences, loading } = useData()
  const completed = useMemo(() => sessions.filter((item) => item.ended_at), [sessions])
  const unit = preferences?.unit || 'kg'

  const stats = useMemo(() => {
    const now = new Date()
    const months = Array.from({ length: 3 }, (_, index) => {
      const date = startOfMonth(now)
      date.setMonth(date.getMonth() - (2 - index))
      return date
    })
    const windowStart = months[0]
    const recentSets = sets.filter((set) => new Date(set.created_at) >= windowStart)
    const volume = months.map((month) => recentSets
      .filter((set) => {
        const date = new Date(set.created_at)
        return date.getFullYear() === month.getFullYear() && date.getMonth() === month.getMonth()
      })
      .reduce((sum, set) => sum + setVolume(set), 0))
    const currentMonth = months[2]
    const previousMonth = months[1]
    const dayOfMonth = now.getDate()
    const previousMonthToDate = sets
      .filter((set) => {
        const date = new Date(set.created_at)
        return date.getFullYear() === previousMonth.getFullYear()
          && date.getMonth() === previousMonth.getMonth()
          && date.getDate() <= dayOfMonth
      })
      .reduce((sum, set) => sum + setVolume(set), 0)
    const currentMonthVolume = volume[2]
    const change = previousMonthToDate > 0
      ? Math.round(((currentMonthVolume - previousMonthToDate) / previousMonthToDate) * 100)
      : null
    const completedInWindow = completed.filter((session) => new Date(session.started_at) >= windowStart)
    const thisMonth = completed.filter((session) => new Date(session.started_at) >= currentMonth)

    return {
      months,
      volume,
      totalVolume: recentSets.reduce((sum, set) => sum + setVolume(set), 0),
      currentMonthVolume,
      change,
      completedInWindow,
      thisMonth,
    }
  }, [completed, sets])

  const categoryFrequency = useMemo(() => {
    const completedIds = new Set(stats.completedInWindow.map((session) => session.id))
    const exerciseCategories = new Map(exercises.map((exercise) => [exercise.id, exercise.category_id]))
    const activeCategories = categories.filter((category) => !category.is_archived)
    const sessionIdsByCategory = new Map(activeCategories.map((category) => [category.id, new Set()]))

    sessionRecords.forEach((record) => {
      if (!completedIds.has(record.session_id)) return
      const categoryId = exerciseCategories.get(record.exercise_id)
      if (sessionIdsByCategory.has(categoryId)) sessionIdsByCategory.get(categoryId).add(record.session_id)
    })

    return activeCategories
      .map((category) => ({
        ...category,
        sessionCount: sessionIdsByCategory.get(category.id)?.size ?? 0,
        exerciseCount: exercises.filter((exercise) => !exercise.is_archived && exercise.category_id === category.id).length,
      }))
      .sort((a, b) => b.sessionCount - a.sessionCount || a.name.localeCompare(b.name))
  }, [categories, exercises, sessionRecords, stats.completedInWindow])

  const recentPrs = useMemo(() => sessionRecords
    .filter((record) => record.is_all_time_pr)
    .sort((a, b) => new Date(b.recorded_at) - new Date(a.recorded_at))
    .slice(0, 5), [sessionRecords])

  if (loading) return <div className="page-loading">Loading your progress…</div>

  const trendIsPositive = stats.change === null || stats.change >= 0
  const TrendIcon = trendIsPositive ? TrendingUp : TrendingDown
  const trendCopy = stats.change === null
    ? (stats.currentMonthVolume > 0 ? 'A new month of training is underway.' : 'Your next workout starts the trend.')
    : `${Math.abs(stats.change)}% ${trendIsPositive ? 'more' : 'less'} volume than this point last month.`

  return (
    <main className="content-page progress-page">
      <header className="page-header progress-header">
        <div><h1>Progress</h1><p>Three months of training load, balance, and breakthroughs.</p></div>
        <button className="secondary-button compact" onClick={() => navigate('/records')}>All records <ArrowRight size={17} /></button>
      </header>

      <section className="progress-overview" aria-labelledby="progress-summary-title">
        <div className={`progress-signal ${trendIsPositive ? 'positive' : 'negative'}`}>
          <span className="progress-signal-icon"><TrendIcon /></span>
          <div><h2 id="progress-summary-title">{trendIsPositive ? 'Momentum' : 'Training load'}</h2><p>{trendCopy}</p></div>
        </div>
        <dl className="progress-metrics">
          <div><dt>3-month volume</dt><dd>{formatVolume(stats.totalVolume)} <small>{unit}</small></dd></div>
          <div><dt>Workouts</dt><dd>{stats.completedInWindow.length}</dd></div>
          <div><dt>Personal records</dt><dd>{records.length}</dd></div>
        </dl>
      </section>

      <section className="section-block progress-chart-section">
        <div className="section-heading progress-section-heading">
          <div><h2>Volume over time</h2><p>Working-set load across the rolling three-month window.</p></div>
          <span className="current-volume"><small>This month</small><strong>{formatVolume(stats.currentMonthVolume)} {unit}</strong></span>
        </div>
        <div className="progress-chart-frame">
          <MiniChart
            values={stats.volume}
            labels={stats.months.map((date) => date.toLocaleDateString(undefined, { month: 'short' }))}
            format={(value) => `${formatVolume(value)} ${unit}`}
            ariaLabel={`Monthly training volume: ${stats.months.map((date, index) => `${date.toLocaleDateString(undefined, { month: 'long' })} ${formatVolume(stats.volume[index])} ${unit}`).join(', ')}`}
          />
        </div>
      </section>

      <section className="section-block">
        <div className="section-heading progress-section-heading">
          <div><h2>Training balance</h2><p>How often each category appeared in your last three months of workouts.</p></div>
          <span className="workout-window"><CalendarDays size={16} />{stats.completedInWindow.length} workouts</span>
        </div>
        {categoryFrequency.length ? (
          <div className="category-frequency-list">
            {categoryFrequency.map((category, index) => {
              const percent = stats.completedInWindow.length ? Math.min(100, category.sessionCount / stats.completedInWindow.length * 100) : 0
              return (
                <div className="category-frequency-row" key={category.id}>
                  <span className={`goal-icon tone-${index % 4}`}><Dumbbell /></span>
                  <span className="category-frequency-copy"><strong>{category.name}</strong><small>{category.exerciseCount} exercises</small></span>
                  <span className="category-frequency-value"><strong>{category.sessionCount}</strong><small>sessions</small></span>
                  <span className="frequency-track" role="progressbar" aria-label={`${category.name}, ${category.sessionCount} of ${stats.completedInWindow.length} workouts`} aria-valuemin="0" aria-valuemax={stats.completedInWindow.length || 1} aria-valuenow={category.sessionCount}><span style={{ width: `${percent}%` }} /></span>
                </div>
              )
            })}
          </div>
        ) : <div className="empty-state progress-empty"><Dumbbell /><h3>No categories yet</h3><p>Create an exercise category to see your training balance.</p></div>}
      </section>

      <section className="section-block">
        <div className="section-heading progress-section-heading"><div><h2>Recent breakthroughs</h2><p>Your latest all-time bests are kept permanently.</p></div></div>
        <div className="history-list">
          {recentPrs.map((record) => {
            const exercise = exercises.find((item) => item.id === record.exercise_id)
            const bodyweight = exercise?.is_bodyweight || ['reps', 'seconds'].includes(exercise?.unit)
            return (
              <button className="history-row progress-pr-row" key={record.id} onClick={() => navigate(`/exercise/${record.exercise_id}`)}>
                <span className="record-rank top"><Trophy /></span>
                <span><strong>{exercise?.name || 'Archived exercise'}</strong><small>{new Date(record.recorded_at).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })} · {record.best_reps_at_weight} {exercise?.unit === 'seconds' ? 'sec' : 'reps'}</small></span>
                <span className="metric">{Number(bodyweight ? record.best_reps_at_weight : record.best_weight).toLocaleString()}<small>{bodyweight ? (exercise?.unit === 'seconds' ? 'sec' : 'reps') : exercise?.unit || unit}</small></span>
                <ArrowRight />
              </button>
            )
          })}
          {!recentPrs.length && <div className="empty-state progress-empty"><Trophy /><h3>No breakthroughs yet</h3><p>Complete a stronger set and your first personal record will appear here.</p></div>}
        </div>
      </section>

      <footer className="progress-footer-note"><Flame size={17} /><span>Detailed sets remain available for three months. Session bests and personal records stay in your history.</span></footer>
    </main>
  )
}
