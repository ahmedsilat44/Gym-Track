import { ArrowLeft, ArrowRight, Search, Trophy } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useNavigate } from '../router'
import { useData } from '../context/DataContext'

export default function Records() {
  const navigate = useNavigate()
  const { categories, exercises, records } = useData()
  const [query, setQuery] = useState('')
  const filteredRecords = useMemo(() => {
    const search = query.trim().toLowerCase()
    return [...records]
      .filter((record) => {
        const exercise = exercises.find((item) => item.id === record.exercise_id)
        const category = categories.find((item) => item.id === exercise?.category_id)
        return !search || `${exercise?.name ?? ''} ${category?.name ?? ''}`.toLowerCase().includes(search)
      })
      .sort((a, b) => new Date(b.achieved_at) - new Date(a.achieved_at))
  }, [categories, exercises, query, records])

  return (
    <main className="content-page records-page">
      <header className="page-header compact-header"><button className="icon-button" onClick={() => navigate('/progress')} aria-label="Back to progress"><ArrowLeft /></button><div><span className="eyebrow">Current personal bests</span><h1>All exercise PRs</h1></div><span className="header-badge"><Trophy /></span></header>
      <label className="search-box records-search" htmlFor="record-search"><Search /><input id="record-search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search exercise or category" /></label>
      <div className="section-heading"><div><span className="eyebrow">Record library</span><h2>{filteredRecords.length} record{filteredRecords.length === 1 ? '' : 's'}</h2></div></div>
      <div className="history-list">{filteredRecords.map((record) => {
        const exercise = exercises.find((item) => item.id === record.exercise_id)
        const category = categories.find((item) => item.id === exercise?.category_id)
        const weightUnit = ['reps', 'seconds'].includes(exercise?.unit) ? 'kg' : exercise?.unit || 'kg'
        return <button className="glass-card history-row" key={record.exercise_id} onClick={() => navigate(`/exercise/${record.exercise_id}`)}><span className="record-rank top"><Trophy /></span><span><strong>{exercise?.name || 'Archived exercise'}</strong><small>{category?.name || 'Unassigned'} · {new Date(record.achieved_at).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })} · {record.best_reps_at_weight} reps</small></span><span className="metric">{Number(record.best_weight).toLocaleString()}<small>{weightUnit}</small></span><ArrowRight /></button>
      })}{!filteredRecords.length && <div className="empty-state glass-card"><Trophy /><h3>{query.trim() ? 'No matching records' : 'No records yet'}</h3><p>{query.trim() ? 'Try another exercise or category.' : 'Complete a set to claim your first PR.'}</p></div>}</div>
    </main>
  )
}
