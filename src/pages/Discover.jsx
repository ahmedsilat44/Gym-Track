import { ArrowRight, Check, Dumbbell, Plus, Search, Sparkles } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useData } from '../context/DataContext'
import { fuzzySearch, normalizeExerciseName } from '../utils/fuzzySearch'

const categoryTone = ['coral', 'teal', 'indigo', 'amber', 'blue']
const exerciseTypes = ['all', 'strength', 'cardio', 'mobility', 'conditioning', 'other']

export default function Discover() {
  const navigate = useNavigate()
  const { categories, exercises, exerciseCatalog, addCatalogExercise } = useData()
  const [view, setView] = useState('mine')
  const [query, setQuery] = useState('')
  const [type, setType] = useState('all')
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [notice, setNotice] = useState('')
  const activeCategories = categories.filter((item) => !item.is_archived).sort((a, b) => a.sort_order - b.sort_order)
  const activeExercises = exercises.filter((item) => !item.is_archived)
  const filtered = useMemo(() => fuzzySearch(activeExercises.filter((exercise) =>
    (selectedCategory === 'all' || (selectedCategory === 'unassigned' ? !exercise.category_id : exercise.category_id === selectedCategory))
      && (type === 'all' || (exercise.exercise_type || 'strength') === type)), query), [activeExercises, query, selectedCategory, type])
  const catalogResults = useMemo(() => fuzzySearch(exerciseCatalog.filter((exercise) => type === 'all' || (exercise.exercise_type || 'strength') === type), query), [exerciseCatalog, query, type])
  const ownedNames = new Set(activeExercises.map((item) => normalizeExerciseName(item.name)))

  const addFromCatalog = async (exercise) => {
    try {
      await addCatalogExercise(exercise)
      setNotice(`${exercise.name} added to Unassigned.`)
    } catch (caught) {
      setNotice(caught.message || 'Could not add this exercise.')
    }
    window.setTimeout(() => setNotice(''), 2800)
  }

  return (
    <main className="content-page discover-page">
      <header className="page-header"><div><span className="eyebrow">Exercise library</span><h1>Discover</h1></div><button className="icon-button" onClick={() => navigate('/settings')} aria-label="Manage exercises"><Sparkles /></button></header>
      {notice && <div className="notice-toast" role="status"><Check /> {notice}</div>}
      <div className="library-tabs" role="tablist"><button role="tab" aria-selected={view === 'mine'} className={view === 'mine' ? 'active' : ''} onClick={() => setView('mine')}>My library</button><button role="tab" aria-selected={view === 'universal'} className={view === 'universal' ? 'active' : ''} onClick={() => { setView('universal'); setSelectedCategory('all') }}>Universal list</button></div>
      <div className="exercise-filter-row"><label className="search-box"><Search size={19} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={view === 'mine' ? 'Fuzzy search your exercises' : 'Search the universal list'} /></label><select value={type} onChange={(event) => setType(event.target.value)} aria-label="Filter by exercise type">{exerciseTypes.map((item) => <option value={item} key={item}>{item === 'all' ? 'All types' : item[0].toUpperCase() + item.slice(1)}</option>)}</select></div>

      {view === 'mine' ? <>
        <section className="section-block">
          <div className="section-heading"><div><span className="eyebrow">Build your split</span><h2>Training categories</h2></div><button onClick={() => navigate('/settings')}>Manage <ArrowRight size={16} /></button></div>
          <div className="category-showcase">
            {activeCategories.map((category, index) => { const count = activeExercises.filter((item) => item.category_id === category.id).length; return <button className={`category-feature tone-${categoryTone[index % categoryTone.length]} ${selectedCategory === category.id ? 'selected' : ''}`} key={category.id} onClick={() => setSelectedCategory(selectedCategory === category.id ? 'all' : category.id)}><span className="category-art"><Dumbbell /></span><span><strong>{category.name}</strong><small>{count} exercises</small></span></button> })}
            <button className={`category-feature tone-${categoryTone[activeCategories.length % categoryTone.length]} ${selectedCategory === 'unassigned' ? 'selected' : ''}`} onClick={() => setSelectedCategory(selectedCategory === 'unassigned' ? 'all' : 'unassigned')}><span className="category-art"><Plus /></span><span><strong>Unassigned</strong><small>{activeExercises.filter((item) => !item.category_id).length} exercises</small></span></button>
          </div>
        </section>
        <section className="section-block">
          <div className="section-heading"><div><span className="eyebrow">{selectedCategory === 'all' ? 'All movements' : selectedCategory === 'unassigned' ? 'Unassigned' : activeCategories.find((item) => item.id === selectedCategory)?.name}</span><h2>Your collection</h2></div><span className="count-pill">{filtered.length}</span></div>
          <div className="exercise-list">{filtered.map((exercise, index) => { const category = categories.find((item) => item.id === exercise.category_id); return <button className="exercise-card glass-card" key={exercise.id} onClick={() => navigate(`/exercise/${exercise.id}`)}><span className={`exercise-icon tone-${index % 4}`}><Dumbbell /></span><span className="exercise-copy"><strong>{exercise.name}</strong><small>{category?.name || 'Unassigned'} · {exercise.exercise_type || 'strength'} · {exercise.is_bodyweight ? 'Bodyweight' : exercise.unit}</small></span><ArrowRight size={18} /></button> })}{!filtered.length && <div className="empty-state glass-card"><Search /><h3>No exercises found</h3><p>Try another spelling or add a movement in Settings.</p></div>}</div>
        </section>
      </> : <section className="section-block universal-library">
        <div className="section-heading"><div><span className="eyebrow">Shared by every athlete</span><h2>Universal exercises</h2></div><span className="count-pill">{catalogResults.length}</span></div>
        <p className="section-description">New exercises created by anyone join this searchable list. Add one to your library, then place it in a category from Settings.</p>
        <div className="exercise-list">{catalogResults.map((exercise, index) => { const owned = ownedNames.has(normalizeExerciseName(exercise.name)); return <div className="exercise-card glass-card catalog-card" key={exercise.id}><span className={`exercise-icon tone-${index % 4}`}><Dumbbell /></span><span className="exercise-copy"><strong>{exercise.name}</strong><small>{exercise.exercise_type || 'strength'} · {exercise.is_bodyweight ? 'Bodyweight' : exercise.unit}</small></span><button className={owned ? 'catalog-added' : 'secondary-button compact'} disabled={owned} onClick={() => addFromCatalog(exercise)}>{owned ? <><Check /> Added</> : <><Plus /> Add</>}</button></div> })}{!catalogResults.length && <div className="empty-state glass-card"><Search /><h3>No close matches</h3><p>Try a shorter search or create the movement in Settings.</p></div>}</div>
      </section>}
      <button className="floating-action" onClick={() => navigate('/start')}><Dumbbell /> Start workout</button>
    </main>
  )
}
