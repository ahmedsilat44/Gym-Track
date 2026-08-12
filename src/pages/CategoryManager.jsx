import { ArrowDown, ArrowLeft, ArrowUp, Edit3, FolderCog, Plus, Trash2 } from 'lucide-react'
import { useState } from 'react'
import Modal from '../components/Modal'
import { useData } from '../context/DataContext'
import { useNavigate } from '../router'

export default function CategoryManager() {
  const navigate = useNavigate()
  const { categories, exercises, addCategory, updateCategory, moveCategory, archiveCategory } = useData()
  const [name, setName] = useState('')
  const [notice, setNotice] = useState('')
  const [archive, setArchive] = useState(null)
  const [destination, setDestination] = useState('archive')
  const activeCategories = categories.filter((item) => !item.is_archived).sort((a, b) => a.sort_order - b.sort_order)
  const tell = (message) => { setNotice(message); window.setTimeout(() => setNotice(''), 2500) }
  const perform = async (action, message) => { try { await action(); tell(message); return true } catch (caught) { tell(caught.message || 'Something went wrong.'); return false } }
  const add = async (event) => { event.preventDefault(); if (await perform(() => addCategory(name), 'Category added.')) setName('') }
  const rename = (category) => { const next = window.prompt('Rename category', category.name); if (next?.trim() && next.trim() !== category.name) perform(() => updateCategory(category.id, { name: next.trim() }), 'Category renamed.') }

  return <main className="content-page category-page">
    <header className="page-header compact-header"><button className="icon-button" onClick={() => navigate('/settings')} aria-label="Back to settings"><ArrowLeft /></button><div><h1>Categories</h1><p>Shape your workout split.</p></div><span className="header-badge"><FolderCog /></span></header>
    {notice && <div className="notice-toast" role="status">{notice}</div>}
    <section className="library-intro glass-card"><div><strong>Organize, don’t block</strong><p>Exercises can remain unassigned. Categories simply make finding movements faster.</p></div><button className="secondary-button compact" onClick={() => navigate('/exercises')}>Exercise library</button></section>
    <form className="add-row glass-card" onSubmit={add}><input required value={name} onChange={(event) => setName(event.target.value)} placeholder="New category name" /><button className="primary-button compact" disabled={!name.trim()}><Plus /> Add</button></form>
    <div className="manager-list">{activeCategories.map((category, index) => <div className="glass-card manager-row" key={category.id}><span className="drag-index">{String(index + 1).padStart(2, '0')}</span><span className="manager-copy"><strong>{category.name}</strong><small>{exercises.filter((item) => !item.is_archived && item.category_id === category.id).length} active exercises</small></span><span className="manager-actions"><button disabled={index === 0} onClick={() => moveCategory(category.id, -1)} aria-label="Move up"><ArrowUp /></button><button disabled={index === activeCategories.length - 1} onClick={() => moveCategory(category.id, 1)} aria-label="Move down"><ArrowDown /></button><button onClick={() => rename(category)} aria-label="Rename"><Edit3 /></button><button className="danger-icon" onClick={() => { setArchive(category); setDestination('archive') }} aria-label="Archive"><Trash2 /></button></span></div>)}</div>
    {!activeCategories.length && <div className="empty-state glass-card"><FolderCog /><h2>No categories yet</h2><p>Create one when you need a quicker way to group exercises.</p></div>}
    {archive && <Modal title={`Archive ${archive.name}?`} onClose={() => setArchive(null)} footer={<><button className="secondary-button" onClick={() => setArchive(null)}>Cancel</button><button className="danger-button" onClick={async () => { if (await perform(() => archiveCategory(archive.id, destination), 'Category archived.')) setArchive(null) }}>Archive category</button></>}><p>Historical sessions stay intact. Choose what happens to active exercises.</p>{exercises.some((item) => !item.is_archived && item.category_id === archive.id) ? <label>Move exercises to<select value={destination} onChange={(event) => setDestination(event.target.value)}><option value="archive">Archive exercises too</option><option value="unassigned">Unassigned</option>{activeCategories.filter((item) => item.id !== archive.id).map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}</select></label> : <p className="form-note">No active exercises are in this category.</p>}</Modal>}
  </main>
}
