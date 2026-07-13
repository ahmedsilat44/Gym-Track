import { ArrowDown, ArrowUp, Check, ChevronRight, Database, Download, Dumbbell, Edit3, FolderCog, LogOut, Plus, RotateCcw, Settings as SettingsIcon, Trash2, UserRound } from 'lucide-react'
import { useMemo, useState } from 'react'
import Modal from '../components/Modal'
import { useAuth } from '../context/AuthContext'
import { useData } from '../context/DataContext'

const tabs = [['profile', UserRound, 'Profile'], ['categories', FolderCog, 'Categories'], ['exercises', Dumbbell, 'Exercises'], ['data', Database, 'Data']]

export default function Settings() {
  const { user, isDemo, signOut } = useAuth()
  const { categories, exercises, sessions, sets, preferences, profiles, addCategory, updateCategory, moveCategory, archiveCategory, saveExercise, archiveExercise, saveProfile, resetDemo } = useData()
  const [tab, setTab] = useState('profile')
  const [notice, setNotice] = useState('')
  const [newCategory, setNewCategory] = useState('')
  const [categoryToArchive, setCategoryToArchive] = useState(null)
  const [archiveDestination, setArchiveDestination] = useState('archive')
  const [exerciseForm, setExerciseForm] = useState(null)
  const [query, setQuery] = useState('')
  const activeCategories = categories.filter((item) => !item.is_archived).sort((a, b) => a.sort_order - b.sort_order)
  const socialProfile = profiles.find((item) => item.id === user.id)
  const activeExercises = useMemo(() => exercises.filter((item) => !item.is_archived && item.name.toLowerCase().includes(query.toLowerCase())), [exercises, query])

  const perform = async (action, message) => {
    try { await action(); setNotice(message); window.setTimeout(() => setNotice(''), 2500) }
    catch (caught) { setNotice(caught.message || 'Something went wrong.') }
  }
  const renameCategory = (category) => {
    const name = window.prompt('Rename category', category.name)
    if (name?.trim() && name.trim() !== category.name) perform(() => updateCategory(category.id, { name: name.trim() }), 'Category renamed.')
  }
  const addNewCategory = async (event) => {
    event.preventDefault()
    if (!newCategory.trim()) return
    await perform(() => addCategory(newCategory), 'Category added.')
    setNewCategory('')
  }
  const openExercise = (exercise = null) => setExerciseForm(exercise ? { ...exercise } : { name: '', category_id: activeCategories[0]?.id || '', unit: preferences.unit || 'kg', is_bodyweight: false })
  const submitExercise = async (event) => {
    event.preventDefault()
    await perform(() => saveExercise(exerciseForm), exerciseForm.id ? 'Exercise updated.' : 'Exercise added.')
    setExerciseForm(null)
  }
  const exportCsv = () => {
    const header = ['session_started_at', 'session_ended_at', 'category', 'exercise', 'set_number', 'weight', 'unit', 'reps', 'is_pr', 'notes']
    const rows = sets.map((set) => {
      const session = sessions.find((item) => item.id === set.session_id)
      const exercise = exercises.find((item) => item.id === set.exercise_id)
      const category = categories.find((item) => item.id === session?.category_id)
      return [session?.started_at, session?.ended_at, category?.name, exercise?.name, set.set_number, set.weight, exercise?.unit, set.reps, set.is_pr, session?.notes]
    })
    const csv = [header, ...rows].map((row) => row.map((value) => `"${String(value ?? '').replaceAll('"', '""')}"`).join(',')).join('\n')
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
    const link = document.createElement('a'); link.href = url; link.download = `velocity-workouts-${new Date().toISOString().slice(0, 10)}.csv`; link.click(); URL.revokeObjectURL(url)
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
        <div className="settings-title row-title"><div><span className="eyebrow">Movement library</span><h2>Manage exercises</h2><p>Edit, reassign, or archive exercises without losing set history.</p></div><button className="primary-button compact" onClick={() => openExercise()} disabled={!activeCategories.length}><Plus /> Add exercise</button></div>
        <label className="search-box"><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Filter exercises" /></label>
        <div className="manager-list">{activeExercises.map((exercise) => { const category = categories.find((item) => item.id === exercise.category_id); return <div className="glass-card manager-row" key={exercise.id}><span className="exercise-mini"><Dumbbell /></span><span className="manager-copy"><strong>{exercise.name}</strong><small>{category?.name} · {exercise.is_bodyweight ? 'Bodyweight' : exercise.unit}</small></span><span className="manager-actions"><button onClick={() => openExercise(exercise)}><Edit3 /></button><button className="danger-icon" onClick={() => window.confirm(`Archive ${exercise.name}? Past sets will be kept.`) && perform(() => archiveExercise(exercise.id), 'Exercise archived.')}><Trash2 /></button></span></div> })}{!activeExercises.length && <div className="empty-state glass-card"><Dumbbell /><h3>No active exercises</h3><p>Add a movement to start building your library.</p></div>}</div>
      </section>}

      {tab === 'data' && <section className="settings-panel">
        <div className="settings-title"><span className="eyebrow">Ownership & setup</span><h2>Your data</h2><p>Export your full training history or review the backend connection status.</p></div>
        <button className="glass-card data-action" onClick={exportCsv}><span className="data-icon"><Download /></span><span><strong>Export workout history</strong><small>Download every logged set as a CSV file</small></span><ChevronRight /></button>
        <div className={`glass-card connection-card ${isDemo ? 'demo' : 'connected'}`}><span className="status-dot" /><span><strong>{isDemo ? 'Local demo mode' : 'Supabase connected'}</strong><small>{isDemo ? 'Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to use secure cloud sync.' : 'Authentication, row-level security, and cloud sync are active.'}</small></span></div>
        {isDemo && <button className="secondary-button reset-button" onClick={() => window.confirm('Reset all local demo changes?') && (resetDemo(), setNotice('Demo data reset.'))}><RotateCcw /> Reset demo data</button>}
      </section>}

      {categoryToArchive && <Modal title={`Archive ${categoryToArchive.name}?`} onClose={() => setCategoryToArchive(null)} footer={<><button className="secondary-button" onClick={() => setCategoryToArchive(null)}>Cancel</button><button className="danger-button" onClick={async () => { await perform(() => archiveCategory(categoryToArchive.id, archiveDestination), 'Category archived.'); setCategoryToArchive(null) }}>Archive category</button></>}><p>Its historical sessions will remain intact. Choose what happens to its active exercises.</p>{exercises.some((item) => !item.is_archived && item.category_id === categoryToArchive.id) ? <label>Move exercises to<select value={archiveDestination} onChange={(event) => setArchiveDestination(event.target.value)}><option value="archive">Archive the exercises too</option>{activeCategories.filter((item) => item.id !== categoryToArchive.id).map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}</select></label> : <p className="form-note">This category has no active exercises.</p>}</Modal>}

      {exerciseForm && <Modal title={exerciseForm.id ? 'Edit exercise' : 'Add exercise'} onClose={() => setExerciseForm(null)} footer={<><button className="secondary-button" onClick={() => setExerciseForm(null)}>Cancel</button><button className="primary-button compact" form="exercise-form">Save <Check /></button></>}><form id="exercise-form" className="modal-form" onSubmit={submitExercise}><label>Exercise name<input required value={exerciseForm.name} onChange={(event) => setExerciseForm({ ...exerciseForm, name: event.target.value })} placeholder="e.g. Bulgarian Split Squat" /></label><label>Category<select required value={exerciseForm.category_id} onChange={(event) => setExerciseForm({ ...exerciseForm, category_id: event.target.value })}>{activeCategories.map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}</select></label><label>Unit<select value={exerciseForm.unit} onChange={(event) => setExerciseForm({ ...exerciseForm, unit: event.target.value })}><option value="kg">Kilograms (kg)</option><option value="lb">Pounds (lb)</option><option value="reps">Repetitions</option><option value="seconds">Seconds</option></select></label><label className="checkbox-label"><input type="checkbox" checked={exerciseForm.is_bodyweight} onChange={(event) => setExerciseForm({ ...exerciseForm, is_bodyweight: event.target.checked })} /><span><strong>Bodyweight exercise</strong><small>Weight is treated as optional added resistance.</small></span></label></form></Modal>}
    </main>
  )
}
