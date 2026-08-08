import { CalendarDays, Copy, Dumbbell, Timer } from 'lucide-react'
import Modal from './Modal'

const weekdays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

const formatReps = (exercise) => {
  const minimum = Number(exercise.target_reps_min)
  const maximum = Number(exercise.target_reps_max)
  return minimum === maximum ? `${minimum} reps` : `${minimum}-${maximum} reps`
}

export default function RoutinePreviewModal({ routine, routineDays, routineExercises, authorName, busy, onClose, onCopy }) {
  if (!routine) return null

  const days = routineDays
    .filter((day) => day.routine_id === routine.id)
    .sort((a, b) => a.sort_order - b.sort_order)
  const dayIds = new Set(days.map((day) => day.id))
  const exercises = routineExercises.filter((exercise) => dayIds.has(exercise.routine_day_id))

  return (
    <Modal
      title={routine.name}
      onClose={onClose}
      footer={<><button className="secondary-button" disabled={busy} onClick={onClose}>Close</button><button className="primary-button" disabled={busy} onClick={onCopy}><Copy /> {busy ? 'Copying...' : 'Copy to planner'}</button></>}
    >
      <div className="routine-preview">
        <div className="routine-preview-summary">
          <span className="routine-visibility">{routine.visibility === 'public' ? 'Public' : 'Friends'}</span>
          {routine.description && <p>{routine.description}</p>}
          <div className="routine-preview-meta">
            <span><CalendarDays /> {days.length} day{days.length === 1 ? '' : 's'}</span>
            <span><Dumbbell /> {exercises.length} exercise{exercises.length === 1 ? '' : 's'}</span>
            {authorName && <span>By {authorName}</span>}
          </div>
        </div>

        <div className="routine-preview-days">
          {days.map((day, dayIndex) => {
            const planned = exercises
              .filter((exercise) => exercise.routine_day_id === day.id)
              .sort((a, b) => a.sort_order - b.sort_order)
            return (
              <section className="routine-preview-day" key={day.id}>
                <header>
                  <div><span>Day {dayIndex + 1}</span><h3>{day.name}</h3></div>
                  <small>{day.weekday == null ? 'Flexible' : weekdays[day.weekday]}</small>
                </header>
                <div className="routine-preview-exercises">
                  {planned.map((exercise, exerciseIndex) => (
                    <article className="routine-preview-exercise" key={exercise.id}>
                      <span className="routine-preview-number">{exerciseIndex + 1}</span>
                      <div>
                        <h4>{exercise.exercise_name}</h4>
                        <div className="routine-preview-targets">
                          <span>{exercise.target_sets} sets</span>
                          <span>{formatReps(exercise)}</span>
                          {exercise.target_weight != null && <span>{Number(exercise.target_weight).toLocaleString()} {exercise.unit || 'kg'}</span>}
                          <span><Timer /> {exercise.rest_seconds || 0}s rest</span>
                        </div>
                        {exercise.notes && <p>{exercise.notes}</p>}
                      </div>
                    </article>
                  ))}
                  {!planned.length && <p className="routine-preview-empty">No exercises planned for this day.</p>}
                </div>
              </section>
            )
          })}
          {!days.length && <div className="routine-preview-empty">This routine has no training days yet.</div>}
        </div>
      </div>
    </Modal>
  )
}
