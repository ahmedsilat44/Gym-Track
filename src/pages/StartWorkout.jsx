import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, Check, Dumbbell, Search } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useData } from '../context/DataContext'
import { fuzzySearch } from '../utils/fuzzySearch'

const exerciseTypes = ['all', 'strength', 'cardio', 'mobility', 'conditioning', 'other']

export default function StartWorkout() {
  const navigate = useNavigate()
  const { categories, exercises, startWorkout } = useData()
  const [selected, setSelected] = useState([])
  const [query, setQuery] = useState('')
  const [type, setType] = useState('all')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const activeCategories = categories.filter((item) => !item.is_archived).sort((a, b) => a.sort_order - b.sort_order)
  const activeExercises = exercises.filter((item) => !item.is_archived)
  const visibleExercises = useMemo(() => fuzzySearch(
    activeExercises.filter((item) => type === 'all' || (item.exercise_type || 'strength') === type),
    query,
  ), [activeExercises, query, type])
  const groups = [
    ...activeCategories.map((category) => ({ ...category, exercises: visibleExercises.filter((item) => item.category_id === category.id) })),
    { id: 'unassigned', name: 'Unassigned', exercises: visibleExercises.filter((item) => !item.category_id) },
  ].filter((group) => group.exercises.length)

  const toggle = (id) => setSelected((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id])
  const move = (index, direction) => {
    const nextIndex = index + direction
    if (nextIndex < 0 || nextIndex >= selected.length) return
    setSelected((current) => {
      const next = [...current]
      ;[next[index], next[nextIndex]] = [next[nextIndex], next[index]]
      return next
    })
  }
  const start = async () => {
    if (!selected.length) return
    setBusy(true)
    setError('')
    try {
      const selectedExercises = selected.map((id) => exercises.find((item) => item.id === id)).filter(Boolean)
      const categoryIds = new Set(selectedExercises.map((item) => item.category_id || 'unassigned'))
      const sessionCategoryId = categoryIds.size === 1 && !categoryIds.has('unassigned') ? [...categoryIds][0] : null
      await startWorkout(sessionCategoryId, selected)
      navigate('/session')
    } catch (caught) {
      setError(caught.message || 'Could not start this workout.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="content-page start-page">
      <header className="page-header compact-header"><button className="icon-button" onClick={() => navigate(-1)} aria-label="Go back"><ArrowLeft /></button><div><span className="eyebrow">New session</span><h1>Build your workout</h1></div><span /></header>
      <section className="start-intro"><div className="brand-mark"><Dumbbell /></div><h2>Mix any movements</h2><p>Select exercises from as many categories as you need, then arrange today&apos;s order.</p></section>
      {error && <div className="notice-toast error" role="alert">{error}</div>}

      <section className="selection-section">
        <span className="eyebrow step-label">01 · Find movements</span>
        <div className="exercise-filter-row">
          <label className="search-box"><Search size={19} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Fuzzy search exercises" /></label>
          <select value={type} onChange={(event) => setType(event.target.value)} aria-label="Filter by exercise type">
            {exerciseTypes.map((item) => <option value={item} key={item}>{item === 'all' ? 'All types' : item[0].toUpperCase() + item.slice(1)}</option>)}
          </select>
        </div>
      </section>

      <section className="selection-section">
        <div className="section-heading"><div><span className="eyebrow step-label">02 · Pick exercises</span><h2>{selected.length} selected</h2></div>{visibleExercises.length > 0 && <button onClick={() => setSelected(visibleExercises.every((item) => selected.includes(item.id)) ? selected.filter((id) => !visibleExercises.some((item) => item.id === id)) : [...new Set([...selected, ...visibleExercises.map((item) => item.id)])])}>{visibleExercises.every((item) => selected.includes(item.id)) ? 'Clear visible' : 'Select visible'}</button>}</div>
        <div className="exercise-group-picker">
          {groups.map((group) => <section className="exercise-picker-group" key={group.id}><header><h3>{group.name}</h3><span>{group.exercises.length}</span></header><div className="picker-list">{group.exercises.map((exercise) => <button key={exercise.id} className={selected.includes(exercise.id) ? 'selected' : ''} onClick={() => toggle(exercise.id)}><span className="check-box">{selected.includes(exercise.id) && <Check />}</span><span><strong>{exercise.name}</strong><small>{exercise.exercise_type || 'strength'} · {exercise.is_bodyweight ? 'Bodyweight' : exercise.unit}</small></span></button>)}</div></section>)}
          {!groups.length && <div className="empty-state glass-card"><Search /><h3>No exercises found</h3><p>Try a broader spelling or add a movement in Settings.</p></div>}
        </div>
      </section>

      {selected.length > 0 && <section className="selection-section"><span className="eyebrow step-label">03 · Set the order</span><div className="order-list">{selected.map((id, index) => { const exercise = exercises.find((item) => item.id === id); const category = categories.find((item) => item.id === exercise?.category_id); return <div key={id}><span className="order-number">{String(index + 1).padStart(2, '0')}</span><span className="order-copy"><strong>{exercise?.name}</strong><small>{category?.name || 'Unassigned'}</small></span><span className="order-actions"><button disabled={index === 0} onClick={() => move(index, -1)} aria-label={`Move ${exercise?.name} up`}><ArrowUp /></button><button disabled={index === selected.length - 1} onClick={() => move(index, 1)} aria-label={`Move ${exercise?.name} down`}><ArrowDown /></button></span></div> })}</div></section>}
      <div className="sticky-action"><button className="primary-button" disabled={!selected.length || busy} onClick={start}>{busy ? 'Starting…' : `Start ${selected.length || ''} exercise workout`} <ArrowRight /></button></div>
    </main>
  )
}
