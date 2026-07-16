import { ArrowLeft, ArrowRight, Check, ChevronLeft, ChevronRight, CircleStop, Dumbbell, Flame, ListPlus, Plus, RotateCcw, Search, Target, TimerReset, Trash2, Trophy, Users } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Modal from '../components/Modal'
import Stepper from '../components/Stepper'
import { useData } from '../context/DataContext'
import { fuzzySearch } from '../utils/fuzzySearch'

const formatTimer = (seconds) => [Math.floor(seconds / 3600), Math.floor((seconds % 3600) / 60), seconds % 60].map((value) => String(value).padStart(2, '0')).join(':')
const formatRestTimer = (seconds) => {
  const parts = [Math.floor((seconds % 3600) / 60), seconds % 60]
  if (seconds >= 3600) parts.unshift(Math.floor(seconds / 3600))
  return parts.map((value) => String(value).padStart(2, '0')).join(':')
}
const exerciseTypes = ['all', 'strength', 'cardio', 'mobility', 'conditioning', 'other']

export default function ActiveSession() {
  const navigate = useNavigate()
  const { activeWorkout, categories, exercises, sets, loading, addActiveExercise, removeActiveExercise, logSet, deleteSet, endWorkout, shareProgress } = useData()
  const [exerciseIndex, setExerciseIndex] = useState(0)
  const [weight, setWeight] = useState(20)
  const [reps, setReps] = useState(8)
  const [elapsed, setElapsed] = useState(0)
  const [restElapsed, setRestElapsed] = useState(null)
  const [busy, setBusy] = useState(false)
  const [prMessage, setPrMessage] = useState('')
  const [showFinish, setShowFinish] = useState(false)
  const [notes, setNotes] = useState('')
  const [shareSummary, setShareSummary] = useState(false)
  const [shareVisibility, setShareVisibility] = useState('friends')
  const [showExerciseManager, setShowExerciseManager] = useState(false)
  const [exerciseQuery, setExerciseQuery] = useState('')
  const [exerciseType, setExerciseType] = useState('all')
  const [managerError, setManagerError] = useState('')
  const sessionExercises = activeWorkout?.exerciseIds.map((id) => exercises.find((item) => item.id === id)).filter(Boolean) ?? []
  const exercise = sessionExercises[exerciseIndex]
  const sessionSets = useMemo(() => sets.filter((item) => item.session_id === activeWorkout?.sessionId), [activeWorkout, sets])
  const lastSetAt = useMemo(() => sessionSets.reduce((latest, item) => {
    const timestamp = new Date(item.created_at).getTime()
    return Number.isFinite(timestamp) && timestamp > latest ? timestamp : latest
  }, 0), [sessionSets])
  const exerciseSets = sessionSets.filter((item) => item.exercise_id === exercise?.id).sort((a, b) => a.set_number - b.set_number)
  const target = exercise ? activeWorkout?.targets?.[exercise.id] : null
  const availableExercises = useMemo(() => fuzzySearch(
    exercises.filter((item) => !item.is_archived && !activeWorkout?.exerciseIds.includes(item.id) && (exerciseType === 'all' || (item.exercise_type || 'strength') === exerciseType)),
    exerciseQuery,
  ), [activeWorkout?.exerciseIds, exerciseQuery, exerciseType, exercises])

  useEffect(() => {
    if (!activeWorkout) return undefined
    const tick = () => {
      const now = Date.now()
      setElapsed(Math.max(0, Math.floor((now - new Date(activeWorkout.startedAt).getTime()) / 1000)))
      setRestElapsed(lastSetAt ? Math.max(0, Math.floor((now - lastSetAt) / 1000)) : null)
    }
    tick()
    const timer = window.setInterval(tick, 1000)
    return () => window.clearInterval(timer)
  }, [activeWorkout, lastSetAt])

  useEffect(() => {
    if (!exercise) return
    const previous = sets.find((item) => item.exercise_id === exercise.id)
    setWeight(target?.weight != null ? Number(target.weight) : previous ? Number(previous.weight) : exercise.is_bodyweight ? 0 : 20)
    setReps(target?.repsMin ? Number(target.repsMin) : previous ? Number(previous.reps) : exercise.unit === 'seconds' ? 30 : 8)
  }, [exercise, sets, target?.repsMin, target?.weight])

  useEffect(() => {
    if (!loading && !activeWorkout) navigate('/start', { replace: true })
  }, [activeWorkout, loading, navigate])

  useEffect(() => {
    if (exerciseIndex >= sessionExercises.length) setExerciseIndex(Math.max(0, sessionExercises.length - 1))
  }, [exerciseIndex, sessionExercises.length])

  const totalVolume = sessionSets.reduce((sum, set) => sum + Number(set.weight) * Number(set.reps), 0)
  const completedExercises = sessionExercises.filter((item) => sessionSets.some((set) => set.exercise_id === item.id)).length

  const submitSet = async () => {
    if (!exercise) return
    setBusy(true)
    setPrMessage('')
    try {
      const saved = await logSet({ exerciseId: exercise.id, reps, weight })
      if (saved?.is_pr) {
        setPrMessage(`New personal record on ${exercise.name}`)
        window.setTimeout(() => setPrMessage(''), 3500)
      }
    } finally { setBusy(false) }
  }

  const finish = async () => {
    setBusy(true)
    try {
      const sessionId = await endWorkout(false, notes)
      if (shareSummary) await shareProgress(sessionId, notes, shareVisibility)
      navigate(shareSummary ? '/social' : '/', { replace: true })
    } finally { setBusy(false) }
  }
  const cancel = async () => {
    if (!window.confirm('Cancel this workout? All sets logged in this session will be removed.')) return
    await endWorkout(true)
    navigate('/', { replace: true })
  }

  const addExercise = async (exerciseId) => {
    setBusy(true)
    setManagerError('')
    try {
      await addActiveExercise(exerciseId)
      setExerciseIndex(sessionExercises.length)
    } catch (caught) {
      setManagerError(caught.message || 'Could not add this exercise.')
    } finally { setBusy(false) }
  }

  const removeExercise = async (exerciseId) => {
    const removedIndex = sessionExercises.findIndex((item) => item.id === exerciseId)
    setBusy(true)
    setManagerError('')
    try {
      await removeActiveExercise(exerciseId)
      if (removedIndex < exerciseIndex) setExerciseIndex(exerciseIndex - 1)
      else if (removedIndex === exerciseIndex) setExerciseIndex(Math.min(exerciseIndex, sessionExercises.length - 2))
    } catch (caught) {
      setManagerError(caught.message || 'Could not remove this exercise.')
    } finally { setBusy(false) }
  }

  if (!activeWorkout || !exercise) return <div className="page-loading">Preparing your session…</div>

  return (
    <main className="content-page session-page">
      <header className="session-header"><button className="icon-button" onClick={() => navigate('/')}><ArrowLeft /></button><div><span className="live-label"><i /> Session active</span><h1>{formatTimer(elapsed)}</h1></div><button className="icon-button danger-ghost" onClick={cancel} aria-label="Cancel workout"><CircleStop /></button></header>

      <section className="session-summary glass-card">
        <div><span className="eyebrow">Sets logged</span><strong>{sessionSets.length}</strong></div><div><span className="eyebrow">Volume</span><strong>{Math.round(totalVolume).toLocaleString()} <small>kg</small></strong></div><div><span className="eyebrow">Exercises</span><strong>{completedExercises}<small>/{sessionExercises.length}</small></strong></div>
      </section>

      <div className={`rest-timer ${restElapsed != null ? 'is-running' : ''}`} aria-label={restElapsed == null ? 'Rest timer starts after your first set' : `${formatRestTimer(restElapsed)} since your last set`}>
        <TimerReset aria-hidden="true" />
        <span>Rest</span>
        <strong>{restElapsed == null ? '--:--' : formatRestTimer(restElapsed)}</strong>
        <small>{restElapsed == null ? 'starts after first set' : 'since last set'}</small>
      </div>

      {prMessage && <div className="pr-toast"><Trophy /> <span><strong>PR unlocked</strong><small>{prMessage}</small></span></div>}

      <div className="exercise-switcher">
        <button disabled={exerciseIndex === 0} onClick={() => setExerciseIndex(exerciseIndex - 1)}><ChevronLeft /></button>
        <div><span className="eyebrow">Exercise {exerciseIndex + 1} of {sessionExercises.length}</span><h2>{exercise.name}</h2><small>{exercise.is_bodyweight ? 'Bodyweight movement' : exercise.unit.toUpperCase()}</small></div>
        <button disabled={exerciseIndex === sessionExercises.length - 1} onClick={() => setExerciseIndex(exerciseIndex + 1)}><ChevronRight /></button>
      </div>
      <div className="exercise-dots">{sessionExercises.map((item, index) => <button key={item.id} aria-label={`Go to ${item.name}`} className={`${index === exerciseIndex ? 'active' : ''} ${sessionSets.some((set) => set.exercise_id === item.id) ? 'complete' : ''}`} onClick={() => setExerciseIndex(index)} />)}</div>
      <button className="session-exercise-manager-button" onClick={() => { setManagerError(''); setShowExerciseManager(true) }}><ListPlus /> Add or remove exercises</button>

      {target && <div className="planned-target glass-card"><Target /><span><small>Planned target</small><strong>{target.targetSets} sets × {target.repsMin}{target.repsMax !== target.repsMin ? `–${target.repsMax}` : ''} {exercise.unit === 'seconds' ? 'sec' : 'reps'}{target.weight != null ? ` at ${target.weight} ${exercise.unit}` : ''}</strong>{target.notes && <em>{target.notes}</em>}</span><small>{target.restSeconds}s rest</small></div>}

      <section className="logging-panel glass-card">
        <Stepper label={exercise.is_bodyweight ? 'Added weight' : 'Weight'} value={weight} onChange={setWeight} step={exercise.unit === 'lb' ? 5 : 2.5} min={0} suffix={exercise.unit === 'reps' || exercise.unit === 'seconds' ? 'kg' : exercise.unit} decimals={1} />
        <div className="stepper-divider" />
        <Stepper label={exercise.unit === 'seconds' ? 'Duration' : 'Reps'} value={reps} onChange={setReps} step={1} min={1} suffix={exercise.unit === 'seconds' ? 'sec' : 'reps'} />
        <button className="log-set-button" onClick={submitSet} disabled={busy}><Check /> {busy ? 'Saving…' : `Log set ${exerciseSets.length + 1}`}</button>
      </section>

      <section className="sets-section">
        <div className="section-heading"><div><span className="eyebrow">Current movement</span><h2>Logged sets</h2></div><span className="count-pill">{exerciseSets.length}</span></div>
        <div className="sets-table glass-card">
          <div className="set-row set-head"><span>Set</span><span>Weight</span><span>{exercise.unit === 'seconds' ? 'Time' : 'Reps'}</span><span /></div>
          {exerciseSets.map((set) => <div className="set-row" key={set.id}><span>{String(set.set_number).padStart(2, '0')}{set.is_pr && <Trophy className="tiny-trophy" />}</span><strong>{Number(set.weight).toLocaleString()} <small>{exercise.unit === 'reps' || exercise.unit === 'seconds' ? 'kg' : exercise.unit}</small></strong><strong>{set.reps} <small>{exercise.unit === 'seconds' ? 'sec' : 'reps'}</small></strong><button onClick={() => deleteSet(set.id)} aria-label="Delete set"><Trash2 /></button></div>)}
          {!exerciseSets.length && <div className="empty-set"><RotateCcw /><span>Your first set is ready when you are.</span></div>}
        </div>
      </section>

      <div className="session-actions">
        {exerciseIndex < sessionExercises.length - 1 && <button className="secondary-button" onClick={() => setExerciseIndex(exerciseIndex + 1)}>Next exercise <ArrowRight /></button>}
        <button className="primary-button" onClick={() => setShowFinish(true)}><Dumbbell /> Finish workout</button>
      </div>

      {showFinish && <Modal title="Complete this workout?" onClose={() => setShowFinish(false)} footer={<><button className="secondary-button" onClick={() => setShowFinish(false)}>Keep training</button><button className="primary-button compact" disabled={busy} onClick={finish}>{busy ? 'Saving…' : 'Finish'} <Check /></button></>}><div className="finish-summary"><Flame /><div><strong>{sessionSets.length} sets · {Math.round(totalVolume).toLocaleString()} kg</strong><p>Nice work. Add an optional note before saving this session.</p></div></div><label>Session notes<textarea value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="How did it feel?" rows="3" /></label><label className="checkbox-label share-workout"><input type="checkbox" checked={shareSummary} onChange={(event) => setShareSummary(event.target.checked)} /><Users /><span><strong>Share a progress summary</strong><small>Exercise names and totals are shared, never your individual sets.</small></span></label>{shareSummary && <label>Who can see it?<select value={shareVisibility} onChange={(event) => setShareVisibility(event.target.value)}><option value="friends">Friends only</option><option value="public">Public — every signed-in athlete</option></select></label>}</Modal>}
      {showExerciseManager && <Modal title="Edit today’s workout" onClose={() => setShowExerciseManager(false)} footer={<button className="primary-button compact" onClick={() => setShowExerciseManager(false)}>Done <Check /></button>}>
        <p className="session-manager-note">These changes apply only to this workout. Your saved routine stays unchanged.</p>
        {managerError && <div className="notice-toast error" role="alert">{managerError}</div>}
        <section className="session-exercise-roster">
          <span className="eyebrow">In today’s workout</span>
          {sessionExercises.map((item, index) => {
            const hasSets = sessionSets.some((set) => set.exercise_id === item.id)
            return <div className="session-exercise-row" key={item.id}><span><strong>{item.name}</strong><small>{index + 1} · {hasSets ? 'Sets logged' : 'Not started'}</small></span><button className="danger-icon" disabled={busy || hasSets || sessionExercises.length === 1} onClick={() => removeExercise(item.id)} aria-label={`Remove ${item.name} from today's workout`} title={hasSets ? 'Delete its logged sets first' : 'Remove from today only'}><Trash2 /></button></div>
          })}
        </section>
        <section className="session-exercise-catalog">
          <span className="eyebrow">Add an exercise</span>
          <div className="exercise-filter-row"><label className="search-box"><Search size={19} /><input value={exerciseQuery} onChange={(event) => setExerciseQuery(event.target.value)} placeholder="Search exercises" /></label><select value={exerciseType} onChange={(event) => setExerciseType(event.target.value)} aria-label="Filter by exercise type">{exerciseTypes.map((item) => <option value={item} key={item}>{item === 'all' ? 'All types' : item[0].toUpperCase() + item.slice(1)}</option>)}</select></div>
          <div className="session-add-list">{availableExercises.map((item) => { const category = categories.find((entry) => entry.id === item.category_id); return <button disabled={busy} onClick={() => addExercise(item.id)} key={item.id}><span><strong>{item.name}</strong><small>{category?.name || 'Unassigned'} · {item.exercise_type || 'strength'}</small></span><Plus /></button> })}{!availableExercises.length && <div className="session-manager-empty">No other exercises match your search.</div>}</div>
        </section>
      </Modal>}
    </main>
  )
}
