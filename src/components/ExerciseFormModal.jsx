import { Check } from 'lucide-react'
import { useMemo, useState } from 'react'
import Modal from './Modal'
import { useData } from '../context/DataContext'
import { findSimilarExercises } from '../utils/fuzzySearch'

const exerciseTypes = ['strength', 'cardio', 'mobility', 'conditioning', 'other']

export default function ExerciseFormModal({ exercise = null, onClose, onSaved }) {
  const { categories, exerciseCatalog, preferences, saveExercise } = useData()
  const [form, setForm] = useState(() => exercise ? { ...exercise, category_id: exercise.category_id || '', exercise_type: exercise.exercise_type || 'strength' } : { name: '', category_id: '', exercise_type: 'strength', unit: preferences.unit || 'kg', is_bodyweight: false })
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const activeCategories = categories.filter((item) => !item.is_archived).sort((a, b) => a.sort_order - b.sort_order)
  const similarExercises = useMemo(() => findSimilarExercises(exerciseCatalog, form.name), [exerciseCatalog, form.name])

  const submit = async (event) => {
    event.preventDefault()
    setSaving(true)
    setError('')
    try {
      const saved = await saveExercise({ ...form, id: exercise?.id || null, category_id: form.category_id || null })
      onSaved?.(saved)
      onClose()
    } catch (caught) {
      setError(caught.message || 'Could not save exercise.')
    } finally {
      setSaving(false)
    }
  }

  return <Modal title={exercise ? 'Edit exercise' : 'Create exercise'} onClose={onClose} footer={<><button className="secondary-button" onClick={onClose}>Cancel</button><button className="primary-button compact" form="exercise-form" disabled={saving}>{saving ? 'Saving...' : <>Save <Check /></>}</button></>}>
    <form id="exercise-form" className="modal-form" onSubmit={submit}>
      {error && <div className="notice-toast error" role="alert">{error}</div>}
      <label>Exercise name<input required maxLength="120" autoFocus value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="e.g. Bulgarian Split Squat" /></label>
      {similarExercises.length > 0 && <section className="similar-exercises" aria-live="polite"><strong>Similar exercises already exist</strong><p>{exercise ? 'Choosing a match updates this exercise name.' : 'Choose an existing universal name to prevent near-duplicates.'}</p>{similarExercises.map(({ item, score }) => <button type="button" key={item.id} onClick={() => setForm((current) => ({ ...current, name: item.name, exercise_type: item.exercise_type || 'strength', unit: item.unit, is_bodyweight: item.is_bodyweight }))}><span><b>{item.name}</b><small>{item.exercise_type || 'strength'} · {item.unit}</small></span><span>{Math.round(score * 100)}% match</span></button>)}</section>}
      <label>Category <small>(optional)</small><select value={form.category_id || ''} onChange={(event) => setForm({ ...form, category_id: event.target.value })}><option value="">Unassigned</option>{activeCategories.map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}</select></label>
      <label>Type<select value={form.exercise_type || 'strength'} onChange={(event) => setForm({ ...form, exercise_type: event.target.value })}>{exerciseTypes.map((item) => <option value={item} key={item}>{item[0].toUpperCase() + item.slice(1)}</option>)}</select></label>
      <label>Unit<select value={form.unit} onChange={(event) => setForm({ ...form, unit: event.target.value })}><option value="kg">Kilograms (kg)</option><option value="lb">Pounds (lb)</option><option value="reps">Repetitions</option><option value="seconds">Seconds</option></select></label>
      <label className="checkbox-label"><input type="checkbox" checked={form.is_bodyweight} onChange={(event) => setForm({ ...form, is_bodyweight: event.target.checked })} /><span><strong>Bodyweight exercise</strong><small>Weight is optional added resistance.</small></span></label>
    </form>
  </Modal>
}
