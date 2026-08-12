import { ArrowLeft, Edit3, GripVertical, Plus, Search, Trash2 } from 'lucide-react'
import { useMemo, useState } from 'react'
import ExerciseFormModal from '../components/ExerciseFormModal'
import { useData } from '../context/DataContext'
import { useNavigate } from '../router'
import { fuzzySearch } from '../utils/fuzzySearch'

const exerciseTypes = ['all', 'strength', 'cardio', 'mobility', 'conditioning', 'other']

export default function ExerciseLibrary() {
  const navigate = useNavigate()
  const { categories, exercises, assignExerciseCategory, archiveExercise } = useData()
  const [query, setQuery] = useState('')
  const [type, setType] = useState('all')
  const [editing, setEditing] = useState(undefined)
  const [notice, setNotice] = useState('')
  const [draggedExercise, setDraggedExercise] = useState(null)
  const activeCategories = categories.filter((item) => !item.is_archived).sort((a, b) => a.sort_order - b.sort_order)
  const activeExercises = useMemo(() => fuzzySearch(exercises.filter((item) => !item.is_archived && (type === 'all' || (item.exercise_type || 'strength') === type)), query), [exercises, query, type])
  const groups = [{ id: 'unassigned', name: 'Unassigned', exercises: activeExercises.filter((item) => !item.category_id) }, ...activeCategories.map((category) => ({ ...category, exercises: activeExercises.filter((item) => item.category_id === category.id) }))]
  const tell = (message) => { setNotice(message); window.setTimeout(() => setNotice(''), 2500) }
  const moveExercise = async (exerciseId, categoryId) => {
    const exercise = exercises.find((item) => item.id === exerciseId)
    const targetId = categoryId === 'unassigned' ? null : categoryId
    if (!exercise || exercise.category_id === targetId) return
    try { await assignExerciseCategory(exerciseId, targetId); tell(`${exercise.name} moved.`) } catch (caught) { tell(caught.message || 'Could not move exercise.') }
  }

  return <main className="content-page library-page">
    <header className="page-header compact-header"><button className="icon-button" onClick={() => navigate('/settings')} aria-label="Back to settings"><ArrowLeft /></button><div><h1>Exercise library</h1><p>Create movements, then place them in a category.</p></div><button className="icon-button primary-icon" onClick={() => setEditing(null)} aria-label="Create exercise"><Plus /></button></header>
    {notice && <div className="notice-toast" role="status">{notice}</div>}
    <section className="library-intro glass-card"><div><strong>Create anywhere</strong><p>Unassigned exercises stay usable in any workout. Drag on desktop or use each card’s category menu on mobile.</p></div><button className="secondary-button compact" onClick={() => navigate('/categories')}>Manage categories</button></section>
    <div className="exercise-filter-row"><label className="search-box"><Search size={18} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search exercises" /></label><select value={type} onChange={(event) => setType(event.target.value)} aria-label="Filter by exercise type">{exerciseTypes.map((item) => <option value={item} key={item}>{item === 'all' ? 'All types' : item[0].toUpperCase() + item.slice(1)}</option>)}</select></div>
    <div className="exercise-category-board">{groups.map((group) => <section className={`exercise-drop-zone ${draggedExercise ? 'drag-active' : ''}`} key={group.id} onDragOver={(event) => { event.preventDefault(); event.dataTransfer.dropEffect = 'move' }} onDrop={(event) => { event.preventDefault(); moveExercise(event.dataTransfer.getData('text/plain') || draggedExercise, group.id); setDraggedExercise(null) }}><header><div><h2>{group.name}</h2><p>{group.id === 'unassigned' ? 'Not in a category yet' : 'Exercise category'}</p></div><span className="count-pill">{group.exercises.length}</span></header><div className="category-exercise-stack">{group.exercises.map((exercise) => <article className="glass-card category-exercise-card" key={exercise.id} draggable onDragStart={(event) => { setDraggedExercise(exercise.id); event.dataTransfer.effectAllowed = 'move'; event.dataTransfer.setData('text/plain', exercise.id) }} onDragEnd={() => setDraggedExercise(null)}><GripVertical className="drag-handle" aria-hidden="true" /><span className="manager-copy"><strong>{exercise.name}</strong><small>{exercise.exercise_type || 'strength'} · {exercise.is_bodyweight ? 'Bodyweight' : exercise.unit}</small></span><label className="visually-hidden" htmlFor={`category-${exercise.id}`}>Category for {exercise.name}</label><select id={`category-${exercise.id}`} className="exercise-category-select" value={exercise.category_id || ''} onChange={(event) => moveExercise(exercise.id, event.target.value || 'unassigned')}><option value="">Unassigned</option>{activeCategories.map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}</select><span className="manager-actions"><button onClick={() => setEditing(exercise)} aria-label={`Edit ${exercise.name}`}><Edit3 /></button><button className="danger-icon" onClick={() => window.confirm(`Archive ${exercise.name}? Past sets will be kept.`) && archiveExercise(exercise.id).then(() => tell('Exercise archived.')).catch((caught) => tell(caught.message || 'Could not archive exercise.'))} aria-label={`Archive ${exercise.name}`}><Trash2 /></button></span></article>)}{!group.exercises.length && <div className="drop-placeholder">Drop exercises here</div>}</div></section>)}</div>
    {editing !== undefined && <ExerciseFormModal exercise={editing} onClose={() => setEditing(undefined)} onSaved={() => tell(editing ? 'Exercise updated.' : 'Exercise added to your library.')} />}
  </main>
}
