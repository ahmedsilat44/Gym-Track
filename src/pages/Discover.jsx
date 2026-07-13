import { ArrowRight, Dumbbell, Search, Sparkles } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useData } from '../context/DataContext'

const categoryTone = ['coral', 'teal', 'indigo', 'amber', 'blue']

export default function Discover() {
  const navigate = useNavigate()
  const { categories, exercises } = useData()
  const [query, setQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('all')
  const activeCategories = categories.filter((item) => !item.is_archived).sort((a, b) => a.sort_order - b.sort_order)
  const filtered = useMemo(() => exercises.filter((exercise) => !exercise.is_archived && (selectedCategory === 'all' || exercise.category_id === selectedCategory) && exercise.name.toLowerCase().includes(query.toLowerCase())), [exercises, query, selectedCategory])

  return (
    <main className="content-page discover-page">
      <header className="page-header"><div><span className="eyebrow">Exercise library</span><h1>Discover</h1></div><button className="icon-button" onClick={() => navigate('/settings')} aria-label="Manage exercises"><Sparkles /></button></header>
      <label className="search-box"><Search size={19} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search your exercises" /></label>

      <section className="section-block">
        <div className="section-heading"><div><span className="eyebrow">Build your split</span><h2>Training categories</h2></div><button onClick={() => navigate('/settings')}>Manage <ArrowRight size={16} /></button></div>
        <div className="category-showcase">
          {activeCategories.map((category, index) => {
            const count = exercises.filter((item) => !item.is_archived && item.category_id === category.id).length
            return <button className={`category-feature tone-${categoryTone[index % categoryTone.length]} ${selectedCategory === category.id ? 'selected' : ''}`} key={category.id} onClick={() => setSelectedCategory(selectedCategory === category.id ? 'all' : category.id)}><span className="category-art"><Dumbbell /></span><span><strong>{category.name}</strong><small>{count} exercises</small></span></button>
          })}
        </div>
      </section>

      <section className="section-block">
        <div className="section-heading"><div><span className="eyebrow">{selectedCategory === 'all' ? 'All movements' : activeCategories.find((item) => item.id === selectedCategory)?.name}</span><h2>Your collection</h2></div><span className="count-pill">{filtered.length}</span></div>
        <div className="exercise-list">
          {filtered.map((exercise, index) => {
            const category = categories.find((item) => item.id === exercise.category_id)
            return <button className="exercise-card glass-card" key={exercise.id} onClick={() => navigate(`/exercise/${exercise.id}`)}><span className={`exercise-icon tone-${index % 4}`}><Dumbbell /></span><span className="exercise-copy"><strong>{exercise.name}</strong><small>{category?.name} · {exercise.is_bodyweight ? 'Bodyweight' : exercise.unit}</small></span><ArrowRight size={18} /></button>
          })}
          {!filtered.length && <div className="empty-state glass-card"><Search /><h3>No exercises found</h3><p>Try another search or add a movement in Settings.</p></div>}
        </div>
      </section>
      <button className="floating-action" onClick={() => navigate('/start')}><Dumbbell /> Start workout</button>
    </main>
  )
}
