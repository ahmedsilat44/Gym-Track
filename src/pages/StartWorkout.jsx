import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, Check, Dumbbell } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useData } from '../context/DataContext'

export default function StartWorkout() {
  const navigate = useNavigate()
  const { categories, exercises, activeWorkout, startWorkout } = useData()
  const activeCategories = categories.filter((item) => !item.is_archived).sort((a, b) => a.sort_order - b.sort_order)
  const [categoryId, setCategoryId] = useState(activeCategories[0]?.id || '')
  const [selected, setSelected] = useState([])
  const [busy, setBusy] = useState(false)
  const available = exercises.filter((item) => !item.is_archived && item.category_id === categoryId)

  useEffect(() => setSelected([]), [categoryId])
  useEffect(() => { if (activeWorkout) navigate('/session', { replace: true }) }, [activeWorkout, navigate])

  const toggle = (id) => setSelected((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id])
  const move = (index, direction) => {
    const nextIndex = index + direction
    if (nextIndex < 0 || nextIndex >= selected.length) return
    setSelected((current) => { const next = [...current]; [next[index], next[nextIndex]] = [next[nextIndex], next[index]]; return next })
  }
  const start = async () => {
    if (!selected.length) return
    setBusy(true)
    try { await startWorkout(categoryId, selected); navigate('/session') } finally { setBusy(false) }
  }

  return (
    <main className="content-page start-page">
      <header className="page-header compact-header"><button className="icon-button" onClick={() => navigate(-1)}><ArrowLeft /></button><div><span className="eyebrow">New session</span><h1>Build your workout</h1></div><span /></header>
      <section className="start-intro"><div className="brand-mark"><Dumbbell /></div><h2>What are we training?</h2><p>Choose a category, then build today’s exercise order.</p></section>
      <section className="selection-section">
        <span className="eyebrow step-label">01 · Choose category</span>
        <div className="category-picker">
          {activeCategories.map((category) => <button className={categoryId === category.id ? 'active' : ''} key={category.id} onClick={() => setCategoryId(category.id)}><span>{category.name}</span><small>{exercises.filter((item) => !item.is_archived && item.category_id === category.id).length} movements</small>{categoryId === category.id && <Check />}</button>)}
        </div>
      </section>
      <section className="selection-section">
        <div className="section-heading"><div><span className="eyebrow step-label">02 · Pick exercises</span><h2>{selected.length} selected</h2></div>{available.length > 0 && <button onClick={() => setSelected(selected.length === available.length ? [] : available.map((item) => item.id))}>{selected.length === available.length ? 'Clear' : 'Select all'}</button>}</div>
        <div className="picker-list">
          {available.map((exercise) => <button key={exercise.id} className={selected.includes(exercise.id) ? 'selected' : ''} onClick={() => toggle(exercise.id)}><span className="check-box">{selected.includes(exercise.id) && <Check />}</span><span><strong>{exercise.name}</strong><small>{exercise.is_bodyweight ? 'Bodyweight' : exercise.unit}</small></span></button>)}
          {!available.length && <div className="empty-state glass-card"><Dumbbell /><h3>No exercises here yet</h3><p>Add one from Settings before starting.</p></div>}
        </div>
      </section>
      {selected.length > 0 && <section className="selection-section"><span className="eyebrow step-label">03 · Set the order</span><div className="order-list">{selected.map((id, index) => { const exercise = exercises.find((item) => item.id === id); return <div key={id}><span className="order-number">{String(index + 1).padStart(2, '0')}</span><strong>{exercise?.name}</strong><span className="order-actions"><button disabled={index === 0} onClick={() => move(index, -1)}><ArrowUp /></button><button disabled={index === selected.length - 1} onClick={() => move(index, 1)}><ArrowDown /></button></span></div> })}</div></section>}
      <div className="sticky-action"><button className="primary-button" disabled={!selected.length || busy} onClick={start}>{busy ? 'Starting…' : `Start ${selected.length || ''} exercise workout`} <ArrowRight /></button></div>
    </main>
  )
}
