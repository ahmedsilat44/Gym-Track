import { ArrowDown, ArrowUp, Check, ChevronRight, Database, Download, Dumbbell, Edit3, FolderCog, GripVertical, LogOut, Plus, RotateCcw, Search, Settings as SettingsIcon, Trash2, UserRound } from 'lucide-react'
import { useMemo, useState } from 'react'
import Modal from '../components/Modal'
import { useAuth } from '../context/AuthContext'
import { useData } from '../context/DataContext'
import { findSimilarExercises, fuzzySearch } from '../utils/fuzzySearch'

const tabs = [['profile', UserRound, 'Profile'], ['categories', FolderCog, 'Categories'], ['exercises', Dumbbell, 'Exercises'], ['data', Database, 'Data']]
const exerciseTypes = ['all', 'strength', 'cardio', 'mobility', 'conditioning', 'other']

export default function Settings() {
  const { user, isDemo, signOut } = useAuth()
  const {
    categories, exercises, exerciseCatalog, sessions, sets, preferences, profiles,
    addCategory, updateCategory, moveCategory, archiveCategory, saveExercise,
    assignExerciseCategory, archiveExercise, saveProfile, resetDemo,
  } = useData()
  const [tab, setTab] = useState('profile')
  const [notice, setNotice] = useState('')
  const [newCategory, setNewCategory] = useState('')
  const [categoryToArchive, setCategoryToArchive] = useState(null)
  const [archiveDestination, setArchiveDestination] = useState('archive')
  const [exerciseForm, setExerciseForm] = useState(null)
  const [editingExerciseId, setEditingExerciseId] = useState(null)
  const [query, setQuery] = useState('')
  const [type, setType] = useState('all')
  const [draggedExercise, setDraggedExercise] = useState(null)

  const activeCategories = categories.filter((item) => !item.is_archived).sort((a, b) => a.sort_order - b.sort_order)
  const socialProfile = profiles.find((item) => item.id === user.id)
  const activeExercises = useMemo(() => fuzzySearch(exercises.filter((item) => !item.is_archived && (type === 'all' || (item.exercise_type || 'strength') === type)), query), [exercises, query, type])
  const similarExercises = useMemo(() => findSimilarExercises(exerciseCatalog, exerciseForm?.name || ''), [exerciseCatalog, exerciseForm?.name])
  const exerciseGroups = [
    { id: 'unassigned', name: 'Unassigned', exercises: activeExercises.filter((item) => !item.category_id) },
    ...activeCategories.map((category) => ({ ...category, exercises: activeExercises.filter((item) => item.category_id === category.id) })),
  ]

  const perform = async (action, message) => {
    try {
      await action()
      setNotice(message)
      window.setTimeout(() => setNotice(''), 2500)
      return true
    } catch (caught) {
      setNotice(caught.message || 'Something went wrong.')
      return false
    }
  }
  const renameCategory = (category) => {
    const name = window.prompt('Rename category', category.name)
    if (name?.trim() && name.trim() !== category.name) perform(() => updateCategory(category.id, { name: name.trim() }), 'Category renamed.')
  }
  const addNewCategory = async (event) => {
    event.preventDefault()
    if (!newCategory.trim()) return
    const saved = await perform(() => addCategory(newCategory), 'Category added.')
    if (saved) setNewCategory('')
  }
  const openExercise = (exercise = null) => {
    setEditingExerciseId(exercise?.id || null)
    setExerciseForm(exercise ? { ...exercise, category_id: exercise.category_id || '', exercise_type: exercise.exercise_type || 'strength' } : { name: '', category_id: '', exercise_type: 'strength', unit: preferences.unit || 'kg', is_bodyweight: false })
  }
  const closeExercise = () => {
    setExerciseForm(null)
    setEditingExerciseId(null)
  }
  const submitExercise = async (event) => {
    event.preventDefault()
    const saved = await perform(() => saveExercise({ ...exerciseForm, id: editingExerciseId, category_id: exerciseForm.category_id || null }), editingExerciseId ? 'Exercise updated.' : 'Exercise added to your library and the universal list.')
    if (saved) closeExercise()
  }
  const moveExercise = async (exerciseId, categoryId) => {
    if (!exerciseId) return
    const exercise = exercises.find((item) => item.id === exerciseId)
    const targetId = categoryId === 'unassigned' ? null : categoryId
    if (!exercise || exercise.category_id === targetId) return
    await perform(() => assignExerciseCategory(exerciseId, targetId), `${exercise.name} moved to ${targetId ? activeCategories.find((item) => item.id === targetId)?.name : 'Unassigned'}.`)
  }
  const dropExercise = (event, categoryId) => {
    event.preventDefault()
    const exerciseId = event.dataTransfer.getData('text/plain') || draggedExercise
    setDraggedExercise(null)
    moveExercise(exerciseId, categoryId)
  }
  const exportCsv = () => {
    const header = ['session_started_at', 'session_ended_at', 'category', 'exercise', 'set_number', 'weight', 'unit', 'reps', 'is_pr', 'notes']
    const rows = sets.map((set) => {
      const session = sessions.find((item) => item.id === set.session_id)
      const exercise = exercises.find((item) => item.id === set.exercise_id)
      const category = categories.find((item) => item.id === session?.category_id)
      return [session?.started_at, session?.ended_at, category?.name || 'Mixed / Unassigned', exercise?.name, set.set_number, set.weight, exercise?.unit, set.reps, set.is_pr, session?.notes]
    })
    const escapeCsvCell = (value) => {
      const text = String(value ?? '')
      const spreadsheetSafe = /^[=+\-@\t\r]/.test(text) ? `'${text}` : text
      return `"${spreadsheetSafe.replaceAll('"', '""')}"`
    }
    const csv = [header, ...rows].map((row) => row.map(escapeCsvCell).join(',')).join('\n')
    const url = URL.createObjectURL(new Blob(['\ufeff', csv], { type: 'text/csv;charset=utf-8' }))
    const link = document.createElement('a')
    link.href = url
    link.download = `velocity-workouts-${new Date().toISOString().slice(0, 10)}.csv`
    link.click()
    URL.revokeObjectURL(url)
  }

  return (
    <main className="content-page settings-page">
      <header className="page-header"><div><span className="eyebrow">Your training system</span><h1>Settings</h1></div><span className="header-badge"><SettingsIcon /></span></header>
      {notice && <div className="notice-toast" role="status"><Check /> {notice}</div>}
      <div className="settings-tabs" role="tablist">{tabs.map(([id, Icon, label]) => <button role="tab" aria-selected={tab === id} className={tab === id ? 'active' : ''} onClick={() => setTab(id)} key={id}><Icon /><span>{label}</span></button>)}</div>

      {tab === 'profile' && <section className="settings-panel">
        <div className="settings-title"><span className="eyebrow">Athlete preferences</span><h2>Profile & units</h2><p>Personalize your training and choose how friends find you on the social board.</p></div>
        <form className="glass-card settings-form" onSubmit={(event) => { event.preventDefault(); const form = new FormData(event.currentTarget); perform(() => saveProfile({ display_name: form.get('display_name'), username: form.get('username'), bio: form.get('bio'), unit: form.get('unit') }), 'Profile saved.') }}>
          <label>Display name<input name="display_name" defaultValue={preferences.display_name || user.user_metadata?.display_name || ''} /></label>
          <label>Username<input name="username" required minLength="3" maxLength="30" pattern="[a-z0-9_]+" defaultValue={socialProfile?.username || ''} placeholder="your_username" /></label>
          <label>Default weight unit<select name="unit" defaultValue={preferences.unit || 'kg'}><option value="kg">Kilograms (kg)</option><option value="lb">Pounds (lb)</option></select></label>
          <label className="profile-bio">Social bio<textarea name="bio" maxLength="240" rows="3" defaultValue={socialProfile?.bio || ''} placeholder="Tell your training circle what you are working on." /></label>
          <div className="form-note">Your name, username, and bio are discoverable to signed-in athletes. Workout history stays private unless you share a summary.</div>
          <button className="primary-button compact">Save profile <Check /></button>
        </form>
        <div className="glass-card account-row"><span className="avatar small">{(preferences.display_name || user.email).slice(0, 2).toUpperCase()}</span><span><strong>{user.email}</strong><small>{isDemo ? 'Local demo athlete' : 'Supabase account'}</small></span>{!isDemo && <button className="danger-button" onClick={signOut}><LogOut /> Sign out</button>}</div>
      </section>}

      {tab === 'categories' && <section className="settings-panel">
        <div className="settings-title"><span className="eyebrow">Editable workout split</span><h2>Manage categories</h2><p>Rename and reorder your split. Archiving preserves all historical sessions.</p></div>
        <form className="add-row glass-card" onSubmit={addNewCategory}><input value={newCategory} onChange={(event) => setNewCategory(event.target.value)} placeholder="New category name" /><button className="primary-button compact" disabled={!newCategory.trim()}><Plus /> Add</button></form>
        <div className="manager-list">{activeCategories.map((category, index) => { const exerciseCount = exercises.filter((item) => !item.is_archived && item.category_id === category.id).length; return <div className="glass-card manager-row" key={category.id}><span className="drag-index">{String(index + 1).padStart(2, '0')}</span><span className="manager-copy"><strong>{category.name}</strong><small>{exerciseCount} active exercises</small></span><span className="manager-actions"><button disabled={index === 0} onClick={() => moveCategory(category.id, -1)} aria-label="Move up"><ArrowUp /></button><button disabled={index === activeCategories.length - 1} onClick={() => moveCategory(category.id, 1)} aria-label="Move down"><ArrowDown /></button><button onClick={() => renameCategory(category)} aria-label="Rename"><Edit3 /></button><button className="danger-icon" onClick={() => { setCategoryToArchive(category); setArchiveDestination('archive') }} aria-label="Archive"><Trash2 /></button></span></div> })}</div>
      </section>}

      {tab === 'exercises' && <section className="settings-panel">
        <div className="settings-title row-title"><div><span className="eyebrow">Movement library</span><h2>Manage exercises</h2><p>Create without a category, then drag cards between category boards. The select menu is a mobile-friendly alternative.</p></div><button className="primary-button compact" onClick={() => openExercise()}><Plus /> Add exercise</button></div>
        <div className="exercise-filter-row"><label className="search-box"><Search size={18} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Fuzzy search exercises" /></label><select value={type} onChange={(event) => setType(event.target.value)} aria-label="Filter by exercise type">{exerciseTypes.map((item) => <option value={item} key={item}>{item === 'all' ? 'All types' : item[0].toUpperCase() + item.slice(1)}</option>)}</select></div>
        <div className="exercise-category-board">{exerciseGroups.map((group) => <section className={`exercise-drop-zone ${draggedExercise ? 'drag-active' : ''}`} key={group.id} onDragOver={(event) => { event.preventDefault(); event.dataTransfer.dropEffect = 'move' }} onDrop={(event) => dropExercise(event, group.id)}><header><div><span className="eyebrow">Category</span><h3>{group.name}</h3></div><span className="count-pill">{group.exercises.length}</span></header><div className="category-exercise-stack">{group.exercises.map((exercise) => <article className="glass-card category-exercise-card" key={exercise.id} draggable onDragStart={(event) => { setDraggedExercise(exercise.id); event.dataTransfer.effectAllowed = 'move'; event.dataTransfer.setData('text/plain', exercise.id) }} onDragEnd={() => setDraggedExercise(null)}><GripVertical className="drag-handle" aria-hidden="true" /><span className="manager-copy"><strong>{exercise.name}</strong><small>{exercise.exercise_type || 'strength'} · {exercise.is_bodyweight ? 'Bodyweight' : exercise.unit}</small></span><label className="visually-hidden" htmlFor={`category-${exercise.id}`}>Category for {exercise.name}</label><select id={`category-${exercise.id}`} className="exercise-category-select" value={exercise.category_id || ''} onChange={(event) => moveExercise(exercise.id, event.target.value || 'unassigned')}><option value="">Unassigned</option>{activeCategories.map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}</select><span className="manager-actions"><button onClick={() => openExercise(exercise)} aria-label={`Edit ${exercise.name}`}><Edit3 /></button><button className="danger-icon" onClick={() => window.confirm(`Archive ${exercise.name}? Past sets will be kept.`) && perform(() => archiveExercise(exercise.id), 'Exercise archived.')} aria-label={`Archive ${exercise.name}`}><Trash2 /></button></span></article>)}{!group.exercises.length && <div className="drop-placeholder">Drop exercises here</div>}</div></section>)}</div>
      </section>}

      {tab === 'data' && <section className="settings-panel">
        <div className="settings-title"><span className="eyebrow">Ownership & setup</span><h2>Your data</h2><p>Export your full training history or review the backend connection status.</p></div>
        <button className="glass-card data-action" onClick={exportCsv}><span className="data-icon"><Download /></span><span><strong>Export workout history</strong><small>Download every logged set as a CSV file</small></span><ChevronRight /></button>
        <div className={`glass-card connection-card ${isDemo ? 'demo' : 'connected'}`}><span className="status-dot" /><span><strong>{isDemo ? 'Local demo mode' : 'Supabase connected'}</strong><small>{isDemo ? 'Add VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY to use secure cloud sync.' : 'Authentication, persistent login, row-level security, and cloud sync are active.'}</small></span></div>
        {isDemo && <button className="secondary-button reset-button" onClick={() => window.confirm('Reset all local demo changes?') && (resetDemo(), setNotice('Demo data reset.'))}><RotateCcw /> Reset demo data</button>}
      </section>}

      {categoryToArchive && <Modal title={`Archive ${categoryToArchive.name}?`} onClose={() => setCategoryToArchive(null)} footer={<><button className="secondary-button" onClick={() => setCategoryToArchive(null)}>Cancel</button><button className="danger-button" onClick={async () => { const archived = await perform(() => archiveCategory(categoryToArchive.id, archiveDestination), 'Category archived.'); if (archived) setCategoryToArchive(null) }}>Archive category</button></>}><p>Its historical sessions will remain intact. Choose what happens to its active exercises.</p>{exercises.some((item) => !item.is_archived && item.category_id === categoryToArchive.id) ? <label>Move exercises to<select value={archiveDestination} onChange={(event) => setArchiveDestination(event.target.value)}><option value="archive">Archive the exercises too</option><option value="unassigned">Unassigned</option>{activeCategories.filter((item) => item.id !== categoryToArchive.id).map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}</select></label> : <p className="form-note">This category has no active exercises.</p>}</Modal>}

      {exerciseForm && <Modal title={editingExerciseId ? 'Edit exercise' : 'Add exercise'} onClose={closeExercise} footer={<><button className="secondary-button" onClick={closeExercise}>Cancel</button><button className="primary-button compact" form="exercise-form">Save <Check /></button></>}><form id="exercise-form" className="modal-form" onSubmit={submitExercise}><label>Exercise name<input required maxLength="120" value={exerciseForm.name} onChange={(event) => setExerciseForm({ ...exerciseForm, name: event.target.value })} placeholder="e.g. Bulgarian Split Squat" /></label>{similarExercises.length > 0 && <section className="similar-exercises" aria-live="polite"><strong>Similar exercises already exist</strong><p>{editingExerciseId ? 'Choosing a match updates this exercise with the standardized name.' : 'Choose an existing universal name to prevent near-duplicates.'}</p>{similarExercises.map(({ item, score }) => <button type="button" key={item.id} onClick={() => setExerciseForm((current) => ({ ...current, name: item.name, exercise_type: item.exercise_type || 'strength', unit: item.unit, is_bodyweight: item.is_bodyweight }))}><span><b>{item.name}</b><small>{item.exercise_type || 'strength'} · {item.unit}</small></span><span>{Math.round(score * 100)}% match</span></button>)}</section>}<label>Category <small>(optional)</small><select value={exerciseForm.category_id || ''} onChange={(event) => setExerciseForm({ ...exerciseForm, category_id: event.target.value })}><option value="">Unassigned</option>{activeCategories.map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}</select></label><label>Type<select value={exerciseForm.exercise_type || 'strength'} onChange={(event) => setExerciseForm({ ...exerciseForm, exercise_type: event.target.value })}>{exerciseTypes.filter((item) => item !== 'all').map((item) => <option value={item} key={item}>{item[0].toUpperCase() + item.slice(1)}</option>)}</select></label><label>Unit<select value={exerciseForm.unit} onChange={(event) => setExerciseForm({ ...exerciseForm, unit: event.target.value })}><option value="kg">Kilograms (kg)</option><option value="lb">Pounds (lb)</option><option value="reps">Repetitions</option><option value="seconds">Seconds</option></select></label><label className="checkbox-label"><input type="checkbox" checked={exerciseForm.is_bodyweight} onChange={(event) => setExerciseForm({ ...exerciseForm, is_bodyweight: event.target.checked })} /><span><strong>Bodyweight exercise</strong><small>Weight is treated as optional added resistance.</small></span></label></form></Modal>}
    </main>
  )
}
