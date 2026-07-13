import { ArrowLeft, ArrowRight, Check, ChevronLeft, ChevronRight, CircleStop, Dumbbell, Flame, RotateCcw, Trash2, Trophy } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Modal from '../components/Modal'
import Stepper from '../components/Stepper'
import { useData } from '../context/DataContext'

const formatTimer = (seconds) => [Math.floor(seconds / 3600), Math.floor((seconds % 3600) / 60), seconds % 60].map((value) => String(value).padStart(2, '0')).join(':')

export default function ActiveSession() {
  const navigate = useNavigate()
  const { activeWorkout, exercises, sets, loading, logSet, deleteSet, endWorkout } = useData()
  const [exerciseIndex, setExerciseIndex] = useState(0)
  const [weight, setWeight] = useState(20)
  const [reps, setReps] = useState(8)
  const [elapsed, setElapsed] = useState(0)
  const [busy, setBusy] = useState(false)
  const [prMessage, setPrMessage] = useState('')
  const [showFinish, setShowFinish] = useState(false)
  const [notes, setNotes] = useState('')
  const sessionExercises = activeWorkout?.exerciseIds.map((id) => exercises.find((item) => item.id === id)).filter(Boolean) ?? []
  const exercise = sessionExercises[exerciseIndex]
  const sessionSets = useMemo(() => sets.filter((item) => item.session_id === activeWorkout?.sessionId), [activeWorkout, sets])
  const exerciseSets = sessionSets.filter((item) => item.exercise_id === exercise?.id).sort((a, b) => a.set_number - b.set_number)

  useEffect(() => {
    if (!activeWorkout) return undefined
    const tick = () => setElapsed(Math.max(0, Math.floor((Date.now() - new Date(activeWorkout.startedAt).getTime()) / 1000)))
    tick()
    const timer = window.setInterval(tick, 1000)
    return () => window.clearInterval(timer)
  }, [activeWorkout])

  useEffect(() => {
    if (!exercise) return
    const previous = sets.find((item) => item.exercise_id === exercise.id)
    setWeight(previous ? Number(previous.weight) : exercise.is_bodyweight ? 0 : 20)
    setReps(previous ? Number(previous.reps) : exercise.unit === 'seconds' ? 30 : 8)
  }, [exercise, sets])

  useEffect(() => {
    if (!loading && !activeWorkout) navigate('/start', { replace: true })
  }, [activeWorkout, loading, navigate])

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
    try { await endWorkout(false, notes); navigate('/', { replace: true }) } finally { setBusy(false) }
  }
  const cancel = async () => {
    if (!window.confirm('Cancel this workout? All sets logged in this session will be removed.')) return
    await endWorkout(true)
    navigate('/', { replace: true })
  }

  if (!activeWorkout || !exercise) return <div className="page-loading">Preparing your session…</div>

  return (
    <main className="content-page session-page">
      <header className="session-header"><button className="icon-button" onClick={() => navigate('/')}><ArrowLeft /></button><div><span className="live-label"><i /> Session active</span><h1>{formatTimer(elapsed)}</h1></div><button className="icon-button danger-ghost" onClick={cancel} aria-label="Cancel workout"><CircleStop /></button></header>

      <section className="session-summary glass-card">
        <div><span className="eyebrow">Sets logged</span><strong>{sessionSets.length}</strong></div><div><span className="eyebrow">Volume</span><strong>{Math.round(totalVolume).toLocaleString()} <small>kg</small></strong></div><div><span className="eyebrow">Exercises</span><strong>{completedExercises}<small>/{sessionExercises.length}</small></strong></div>
      </section>

      {prMessage && <div className="pr-toast"><Trophy /> <span><strong>PR unlocked</strong><small>{prMessage}</small></span></div>}

      <div className="exercise-switcher">
        <button disabled={exerciseIndex === 0} onClick={() => setExerciseIndex(exerciseIndex - 1)}><ChevronLeft /></button>
        <div><span className="eyebrow">Exercise {exerciseIndex + 1} of {sessionExercises.length}</span><h2>{exercise.name}</h2><small>{exercise.is_bodyweight ? 'Bodyweight movement' : exercise.unit.toUpperCase()}</small></div>
        <button disabled={exerciseIndex === sessionExercises.length - 1} onClick={() => setExerciseIndex(exerciseIndex + 1)}><ChevronRight /></button>
      </div>
      <div className="exercise-dots">{sessionExercises.map((item, index) => <button key={item.id} aria-label={`Go to ${item.name}`} className={`${index === exerciseIndex ? 'active' : ''} ${sessionSets.some((set) => set.exercise_id === item.id) ? 'complete' : ''}`} onClick={() => setExerciseIndex(index)} />)}</div>

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

      {showFinish && <Modal title="Complete this workout?" onClose={() => setShowFinish(false)} footer={<><button className="secondary-button" onClick={() => setShowFinish(false)}>Keep training</button><button className="primary-button compact" disabled={busy} onClick={finish}>{busy ? 'Saving…' : 'Finish'} <Check /></button></>}><div className="finish-summary"><Flame /><div><strong>{sessionSets.length} sets · {Math.round(totalVolume).toLocaleString()} kg</strong><p>Nice work. Add an optional note before saving this session.</p></div></div><label>Session notes<textarea value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="How did it feel?" rows="3" /></label></Modal>}
    </main>
  )
}
