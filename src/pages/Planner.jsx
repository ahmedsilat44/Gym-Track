import { CalendarDays, Check, Clock3, CopyPlus, Dumbbell, Edit3, Play, Plus, Send, Share2, Trash2 } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Modal from '../components/Modal'
import { useAuth } from '../context/AuthContext'
import { useData } from '../context/DataContext'

const weekdays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const blankDay = () => ({ name: 'Training day', weekday: '', exercises: [] })

export default function Planner() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { categories, routines, routineDays, routineExercises, exercises, startPlannedWorkout, saveRoutine, deleteRoutine, shareRoutine } = useData()
  const [form, setForm] = useState(null)
  const [shareForm, setShareForm] = useState(null)
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState('')
  const [error, setError] = useState('')
  const ownRoutines = routines.filter((item) => item.user_id === user.id)
  const activeExercises = exercises.filter((item) => !item.is_archived)

  const todayPlans = useMemo(() => {
    const today = new Date().getDay()
    return routineDays.filter((day) => day.weekday === today && ownRoutines.some((routine) => routine.id === day.routine_id))
  }, [ownRoutines, routineDays])

  const perform = async (action, message) => {
    setBusy(true); setError('')
    try { await action(); setNotice(message); window.setTimeout(() => setNotice(''), 2800); return true }
    catch (caught) { setError(caught.message || 'Something went wrong.') }
    finally { setBusy(false) }
  }

  const openRoutine = (routine = null) => {
    if (!routine) { setForm({ name: '', description: '', visibility: 'private', days: [blankDay()] }); return }
    const days = routineDays.filter((item) => item.routine_id === routine.id).sort((a, b) => a.sort_order - b.sort_order).map((day) => ({
      ...day,
      weekday: day.weekday ?? '',
      exercises: routineExercises.filter((item) => item.routine_day_id === day.id).sort((a, b) => a.sort_order - b.sort_order).map((item) => ({ ...item, target_weight: item.target_weight ?? '' })),
    }))
    setForm({ ...routine, visibility: routine.visibility ?? (routine.is_shared ? 'friends' : 'private'), days: days.length ? days : [blankDay()] })
  }

  const updateDay = (index, updates) => setForm({ ...form, days: form.days.map((day, dayIndex) => dayIndex === index ? { ...day, ...updates } : day) })
  const addExercise = (dayIndex) => {
    const exercise = activeExercises.find((item) => !form.days[dayIndex].exercises.some((planned) => planned.exercise_id === item.id))
    if (!exercise) return
    updateDay(dayIndex, { exercises: [...form.days[dayIndex].exercises, { exercise_id: exercise.id, exercise_name: exercise.name, unit: exercise.unit, target_sets: 3, target_reps_min: 8, target_reps_max: 12, target_weight: '', rest_seconds: 90, notes: '' }] })
  }
  const updatePlanned = (dayIndex, exerciseIndex, updates) => updateDay(dayIndex, { exercises: form.days[dayIndex].exercises.map((item, itemIndex) => itemIndex === exerciseIndex ? { ...item, ...updates } : item) })

  const submitRoutine = async (event) => {
    event.preventDefault()
    if (form.days.some((day) => !day.name.trim() || !day.exercises.length)) { setError('Every training day needs a name and at least one exercise.'); return }
    if (form.days.some((day) => new Set(day.exercises.map((item) => item.exercise_id)).size !== day.exercises.length)) { setError('Each exercise can appear only once per training day.'); return }
    await perform(async () => { await saveRoutine(form); setForm(null) }, form.id ? 'Routine updated.' : 'Routine created.')
  }

  const start = (dayId) => perform(async () => { await startPlannedWorkout(dayId); navigate('/session') }, '')
  const share = (routine) => setShareForm({ routine, caption: `Try my ${routine.name} routine!`, visibility: routine.visibility === 'public' ? 'public' : 'friends' })
  const publishRoutine = async (event) => {
    event.preventDefault()
    const shared = await perform(() => shareRoutine(shareForm.routine.id, shareForm.caption, shareForm.visibility), `Routine shared with ${shareForm.visibility === 'public' ? 'everyone' : 'your friends'}.`)
    if (shared) setShareForm(null)
  }

  return (
    <main className="content-page planner-page">
      <header className="page-header"><div><span className="eyebrow">Repeatable training</span><h1>Workout planner</h1></div><button className="primary-button compact" onClick={() => openRoutine()}><Plus /> New routine</button></header>
      {notice && <div className="notice-toast" role="status"><Check /> {notice}</div>}
      {error && <p className="form-error">{error}</p>}

      {todayPlans.length > 0 && <section className="planner-today glass-card">
        <span className="planner-calendar"><CalendarDays /></span>
        <div><span className="eyebrow">On your plan today</span><h2>{todayPlans[0].name}</h2><p>{routineExercises.filter((item) => item.routine_day_id === todayPlans[0].id).length} exercises ready with your saved targets.</p></div>
        <button className="primary-button compact" disabled={busy} onClick={() => start(todayPlans[0].id)}><Play /> Start</button>
      </section>}

      <section className="section-block">
        <div className="section-heading"><div><span className="eyebrow">Fixed weekly plans</span><h2>Your routines</h2></div><span className="count-pill">{ownRoutines.length}</span></div>
        <div className="routine-grid">
          {ownRoutines.map((routine) => {
            const days = routineDays.filter((item) => item.routine_id === routine.id).sort((a, b) => a.sort_order - b.sort_order)
            return <article className="glass-card routine-card" key={routine.id}>
              <header><div><span className={`share-state ${(routine.visibility ?? (routine.is_shared ? 'friends' : 'private')) !== 'private' ? 'shared' : ''}`}>{(routine.visibility ?? (routine.is_shared ? 'friends' : 'private')) === 'public' ? <><Share2 /> Public</> : (routine.visibility ?? (routine.is_shared ? 'friends' : 'private')) === 'friends' ? <><Share2 /> Friends</> : 'Private'}</span><h2>{routine.name}</h2><p>{routine.description || 'A fixed workout plan.'}</p></div><button className="icon-button" onClick={() => openRoutine(routine)} aria-label={`Edit ${routine.name}`}><Edit3 /></button></header>
              <div className="routine-days">{days.map((day) => {
                const planned = routineExercises.filter((item) => item.routine_day_id === day.id)
                return <div className={`routine-day ${day.weekday === new Date().getDay() ? 'today' : ''}`} key={day.id}>
                  <span className="day-badge">{day.weekday == null ? String(day.sort_order + 1).padStart(2, '0') : weekdays[day.weekday].slice(0, 3)}</span>
                  <span><strong>{day.name}</strong><small>{planned.length} exercises · {planned.reduce((sum, item) => sum + item.target_sets, 0)} target sets</small></span>
                  <button disabled={busy || !planned.length} onClick={() => start(day.id)} aria-label={`Start ${day.name}`}><Play /></button>
                </div>
              })}</div>
              <footer><button className="secondary-button compact" onClick={() => share(routine)}><Send /> Share</button><button className="danger-button compact" onClick={() => window.confirm(`Delete ${routine.name}?`) && perform(() => deleteRoutine(routine.id), 'Routine deleted.')}><Trash2 /> Delete</button></footer>
            </article>
          })}
          {!ownRoutines.length && <div className="empty-state glass-card"><CopyPlus /><h3>Create your fixed plan</h3><p>Choose recurring days, exercises, sets, reps, weight, and rest once—then start it whenever it is scheduled.</p><button className="primary-button compact" onClick={() => openRoutine()}><Plus /> Build a routine</button></div>}
        </div>
      </section>

      {form && <Modal title={form.id ? 'Edit routine' : 'Create routine'} onClose={() => setForm(null)} footer={<><button className="secondary-button" onClick={() => setForm(null)}>Cancel</button><button className="primary-button compact" form="routine-form" disabled={busy}>{busy ? 'Saving…' : 'Save routine'} <Check /></button></>}>
        <form id="routine-form" className="modal-form routine-form" onSubmit={submitRoutine}>
          <label>Routine name<input required maxLength="100" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="e.g. 4-Day Strength" /></label>
          <label>Description<textarea maxLength="600" rows="2" value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} placeholder="What is this plan focused on?" /></label>
          <label>Routine visibility<select value={form.visibility || 'private'} onChange={(event) => setForm({ ...form, visibility: event.target.value })}><option value="private">Private — only me</option><option value="friends">Friends — accepted friends</option><option value="public">Public — every signed-in athlete</option></select></label>
          <div className="routine-builder-heading"><div><span className="eyebrow">Weekly schedule</span><strong>{form.days.length} training days</strong></div><button type="button" className="secondary-button compact" onClick={() => setForm({ ...form, days: [...form.days, blankDay()] })}><Plus /> Add day</button></div>
          {form.days.map((day, dayIndex) => <section className="routine-builder-day" key={day.id ?? dayIndex}>
            <header><span>{String(dayIndex + 1).padStart(2, '0')}</span><strong>Training day</strong>{form.days.length > 1 && <button type="button" onClick={() => setForm({ ...form, days: form.days.filter((_, index) => index !== dayIndex) })}><Trash2 /></button>}</header>
            <div className="planner-form-grid"><label>Day name<input required value={day.name} onChange={(event) => updateDay(dayIndex, { name: event.target.value })} /></label><label>Repeats on<select value={day.weekday} onChange={(event) => updateDay(dayIndex, { weekday: event.target.value })}><option value="">Flexible / no day</option>{weekdays.map((weekday, index) => <option value={index} key={weekday}>{weekday}</option>)}</select></label></div>
            <div className="planned-exercises">{day.exercises.map((planned, exerciseIndex) => <div className="planned-exercise" key={`${planned.exercise_id}-${exerciseIndex}`}>
              <div className="planned-exercise-title"><span className="exercise-mini"><Dumbbell /></span><label>Exercise<select value={planned.exercise_id} onChange={(event) => { const selected = activeExercises.find((item) => item.id === event.target.value); updatePlanned(dayIndex, exerciseIndex, { exercise_id: selected.id, exercise_name: selected.name, unit: selected.unit }) }}>{activeExercises.filter((item) => item.id === planned.exercise_id || !day.exercises.some((other, index) => index !== exerciseIndex && other.exercise_id === item.id)).map((item) => <option value={item.id} key={item.id}>{item.name} — {categories.find((category) => category.id === item.category_id)?.name || 'Unassigned'}</option>)}</select></label><button type="button" onClick={() => updateDay(dayIndex, { exercises: day.exercises.filter((_, index) => index !== exerciseIndex) })}><Trash2 /></button></div>
              <div className="target-grid"><label>Sets<input type="number" min="1" max="20" required value={planned.target_sets} onChange={(event) => updatePlanned(dayIndex, exerciseIndex, { target_sets: event.target.value })} /></label><label>Min reps<input type="number" min="1" required value={planned.target_reps_min} onChange={(event) => updatePlanned(dayIndex, exerciseIndex, { target_reps_min: event.target.value })} /></label><label>Max reps<input type="number" min={planned.target_reps_min || 1} required value={planned.target_reps_max} onChange={(event) => updatePlanned(dayIndex, exerciseIndex, { target_reps_max: event.target.value })} /></label><label>Weight<input type="number" min="0" step="0.5" value={planned.target_weight} onChange={(event) => updatePlanned(dayIndex, exerciseIndex, { target_weight: event.target.value })} placeholder="Optional" /></label><label>Rest (sec)<input type="number" min="0" max="3600" required value={planned.rest_seconds} onChange={(event) => updatePlanned(dayIndex, exerciseIndex, { rest_seconds: event.target.value })} /></label></div>
              <label>Notes<input maxLength="400" value={planned.notes || ''} onChange={(event) => updatePlanned(dayIndex, exerciseIndex, { notes: event.target.value })} placeholder="Tempo, setup, or technique cue" /></label>
            </div>)}</div>
            <button type="button" className="add-planned-exercise" onClick={() => addExercise(dayIndex)} disabled={!activeExercises.length}><Plus /> Add exercise</button>
          </section>)}
          <p className="form-note"><Clock3 /> Targets appear inside the active workout. Routine sharing never exposes your individual set history.</p>
        </form>
      </Modal>}
      {shareForm && <Modal title={`Share ${shareForm.routine.name}`} onClose={() => setShareForm(null)} footer={<><button className="secondary-button" onClick={() => setShareForm(null)}>Cancel</button><button className="primary-button compact" form="share-routine-form" disabled={busy}><Send /> Share routine</button></>}><form id="share-routine-form" className="modal-form" onSubmit={publishRoutine}><label>Message<textarea rows="3" maxLength="1000" value={shareForm.caption} onChange={(event) => setShareForm({ ...shareForm, caption: event.target.value })} /></label><label>Who can see it?<select value={shareForm.visibility} onChange={(event) => setShareForm({ ...shareForm, visibility: event.target.value })}><option value="friends">Friends only</option><option value="public">Public — every signed-in athlete</option></select></label><p className="form-note">Sharing includes the planned days, exercise names, and targets. It never includes your private set history.</p></form></Modal>}
    </main>
  )
}
