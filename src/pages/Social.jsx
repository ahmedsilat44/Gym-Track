import { Check, Copy, Dumbbell, Heart, MessageCircle, MoreHorizontal, Plus, Search, Send, Share2, Trash2, UserCheck, UserPlus, Users, X } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useData } from '../context/DataContext'

const timeAgo = (value) => {
  const seconds = Math.max(1, Math.floor((Date.now() - new Date(value).getTime()) / 1000))
  if (seconds < 60) return 'just now'
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`
  return new Date(value).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

export default function Social() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { profiles, friendships, feedPosts, postLikes, postComments, routines, routineDays, routineExercises, createPost, toggleLike, addComment, deletePost, sendFriendRequest, respondToFriendRequest, removeFriend, copyRoutine } = useData()
  const [tab, setTab] = useState('feed')
  const [caption, setCaption] = useState('')
  const [visibility, setVisibility] = useState('friends')
  const [query, setQuery] = useState('')
  const [comments, setComments] = useState({})
  const [openComments, setOpenComments] = useState({})
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState('')
  const [error, setError] = useState('')
  const currentProfile = profiles.find((item) => item.id === user.id)
  const accepted = friendships.filter((item) => item.status === 'accepted')
  const incoming = friendships.filter((item) => item.status === 'pending' && item.addressee_id === user.id)
  const outgoing = friendships.filter((item) => item.status === 'pending' && item.requester_id === user.id)
  const friendIds = accepted.map((item) => item.requester_id === user.id ? item.addressee_id : item.requester_id)
  const availableRoutines = routines.filter((item) => item.user_id !== user.id && (item.visibility ?? (item.is_shared ? 'friends' : 'private')) !== 'private')

  const discoverProfiles = useMemo(() => profiles.filter((profile) => {
    if (profile.id === user.id) return false
    const text = `${profile.display_name} ${profile.username}`.toLowerCase()
    return text.includes(query.trim().toLowerCase())
  }), [profiles, query, user.id])

  const perform = async (action, message = '') => {
    setBusy(true); setError('')
    try { await action(); if (message) { setNotice(message); window.setTimeout(() => setNotice(''), 2600) } }
    catch (caught) { setError(caught.message || 'Something went wrong.') }
    finally { setBusy(false) }
  }

  const publish = async (event) => {
    event.preventDefault()
    if (!caption.trim()) return
    await perform(() => createPost({ caption, visibility }), visibility === 'public' ? 'Posted publicly.' : 'Posted to your friends.')
    setCaption('')
  }

  const submitComment = async (event, postId) => {
    event.preventDefault()
    const body = comments[postId] || ''
    if (!body.trim()) return
    await perform(() => addComment(postId, body))
    setComments({ ...comments, [postId]: '' })
    setOpenComments({ ...openComments, [postId]: true })
  }

  const relationship = (profileId) => friendships.find((item) => [item.requester_id, item.addressee_id].includes(profileId))

  return (
    <main className="content-page social-page">
      <header className="page-header"><div><span className="eyebrow">Your training circle</span><h1>Social board</h1></div><span className="header-badge"><Users /></span></header>
      {notice && <div className="notice-toast" role="status"><Check /> {notice}</div>}
      {error && <p className="form-error">{error}</p>}
      <div className="social-tabs"><button className={tab === 'feed' ? 'active' : ''} onClick={() => setTab('feed')}><Share2 /> Board</button><button className={tab === 'friends' ? 'active' : ''} onClick={() => setTab('friends')}><Users /> Friends <span>{friendIds.length}</span></button></div>

      {tab === 'feed' && <div className="social-layout">
        <section className="social-main">
          <form className="glass-card post-composer" onSubmit={publish}><span className="avatar small">{(currentProfile?.display_name || 'A').slice(0, 2).toUpperCase()}</span><textarea rows="2" maxLength="1000" value={caption} onChange={(event) => setCaption(event.target.value)} placeholder="Share a training update…" /><div className="composer-actions"><select value={visibility} onChange={(event) => setVisibility(event.target.value)} aria-label="Post visibility"><option value="friends">Friends only</option><option value="public">Public</option></select><button className="primary-button compact" disabled={busy || !caption.trim()}><Send /> Post</button></div></form>
          {availableRoutines.length > 0 && <section className="shared-routine-shelf"><div className="section-heading"><div><span className="eyebrow">Ready to copy</span><h2>Shared routines</h2></div><span className="count-pill">{availableRoutines.length}</span></div><div>{availableRoutines.map((routine) => { const author = profiles.find((profile) => profile.id === routine.user_id); const days = routineDays.filter((day) => day.routine_id === routine.id); const dayIds = days.map((day) => day.id); const exerciseCount = routineExercises.filter((exercise) => dayIds.includes(exercise.routine_day_id)).length; return <article className="glass-card community-routine" key={routine.id}><span className="routine-visibility">{routine.visibility === 'public' ? 'Public' : 'Friends'}</span><h3>{routine.name}</h3><p>{routine.description || `A routine from ${author?.display_name || 'an athlete'}.`}</p><small>{author?.display_name || 'Athlete'} · {days.length} days · {exerciseCount} exercises</small><button className="secondary-button compact" disabled={busy} onClick={() => perform(async () => { await copyRoutine(routine.id); navigate('/planner') }, 'Routine copied to your planner.')}><Copy /> Copy to planner</button></article> })}</div></section>}
          <div className="feed-list">{feedPosts.map((post) => {
            const author = profiles.find((item) => item.id === post.user_id)
            const likes = postLikes.filter((item) => item.post_id === post.id)
            const liked = likes.some((item) => item.user_id === user.id)
            const replies = postComments.filter((item) => item.post_id === post.id)
            const routine = routines.find((item) => item.id === post.routine_id)
            const meta = post.metadata || {}
            return <article className="glass-card feed-post" key={post.id}>
              <header><span className="avatar small">{(author?.display_name || 'A').slice(0, 2).toUpperCase()}</span><span><strong>{author?.display_name || 'Athlete'}</strong><small>@{author?.username || 'athlete'} · {timeAgo(post.created_at)} <i className={`post-visibility ${post.visibility}`}>{post.visibility === 'public' ? 'Public' : 'Friends'}</i></small></span>{post.user_id === user.id ? <button className="post-menu danger-ghost" onClick={() => window.confirm('Delete this post?') && perform(() => deletePost(post.id))} aria-label="Delete post"><Trash2 /></button> : <MoreHorizontal />}</header>
              {post.caption && <p className="post-caption">{post.caption}</p>}
              {post.post_type === 'workout' && <div className="workout-share-card"><span><Dumbbell /></span><div><small>Completed workout</small><h3>{meta.category_name || 'Training session'}</h3><p>{meta.exercise_count || 0} exercises · {meta.set_count || 0} sets · {Number(meta.total_volume || 0).toLocaleString()} volume</p>{meta.pr_count > 0 && <strong>{meta.pr_count} new PR{meta.pr_count === 1 ? '' : 's'}</strong>}</div></div>}
              {post.post_type === 'routine' && <div className="routine-share-card"><span><Share2 /></span><div><small>Shared routine</small><h3>{meta.routine_name || routine?.name || 'Routine'}</h3><p>{meta.day_count || 0} days · {meta.exercise_count || 0} planned exercises</p></div>{post.user_id !== user.id && routine && <button className="secondary-button compact" disabled={busy} onClick={() => perform(async () => { await copyRoutine(routine.id); navigate('/planner') }, 'Routine copied to your planner.')}><Copy /> Copy</button>}</div>}
              <footer className="post-actions"><button className={liked ? 'liked' : ''} onClick={() => perform(() => toggleLike(post.id))}><Heart fill={liked ? 'currentColor' : 'none'} /> {likes.length || 'Like'}</button><button onClick={() => setOpenComments({ ...openComments, [post.id]: !openComments[post.id] })}><MessageCircle /> {replies.length || 'Comment'}</button></footer>
              {(openComments[post.id] || replies.length > 0) && <div className="comment-area">{replies.map((reply) => { const writer = profiles.find((item) => item.id === reply.user_id); return <div className="comment" key={reply.id}><span className="avatar tiny">{(writer?.display_name || 'A').slice(0, 1).toUpperCase()}</span><p><strong>{writer?.display_name || 'Athlete'}</strong> {reply.body}<small>{timeAgo(reply.created_at)}</small></p></div> })}<form onSubmit={(event) => submitComment(event, post.id)}><input maxLength="500" value={comments[post.id] || ''} onChange={(event) => setComments({ ...comments, [post.id]: event.target.value })} placeholder="Write a comment…" /><button disabled={busy || !(comments[post.id] || '').trim()}><Send /></button></form></div>}
            </article>
          })}{!feedPosts.length && <div className="empty-state glass-card"><Users /><h3>Your board is ready</h3><p>Add friends or post your first training update. Shared workouts and routines will appear here.</p></div>}</div>
        </section>
        <aside className="glass-card social-sidebar"><span className="eyebrow">Your circle</span><h2>{friendIds.length} friend{friendIds.length === 1 ? '' : 's'}</h2><p>Accepted friends see friends-only posts. Public posts and routines are visible to every signed-in athlete on this network.</p><button className="secondary-button" onClick={() => setTab('friends')}><UserPlus /> Manage friends</button></aside>
      </div>}

      {tab === 'friends' && <section className="friends-panel">
        {incoming.length > 0 && <div className="friend-section"><div className="section-heading"><div><span className="eyebrow">Waiting for you</span><h2>Friend requests</h2></div><span className="count-pill">{incoming.length}</span></div><div className="friend-grid">{incoming.map((request) => { const profile = profiles.find((item) => item.id === request.requester_id); return <div className="glass-card friend-card" key={request.id}><span className="avatar">{(profile?.display_name || 'A').slice(0, 2).toUpperCase()}</span><span><strong>{profile?.display_name}</strong><small>@{profile?.username}</small></span><div><button className="primary-button compact" disabled={busy} onClick={() => perform(() => respondToFriendRequest(request.id, true), 'Friend request accepted.')}><Check /> Accept</button><button className="icon-button" disabled={busy} onClick={() => perform(() => respondToFriendRequest(request.id, false))}><X /></button></div></div> })}</div></div>}
        <div className="friend-section"><div className="section-heading"><div><span className="eyebrow">Accepted connections</span><h2>Your friends</h2></div><span className="count-pill">{friendIds.length}</span></div><div className="friend-grid">{accepted.map((connection) => { const id = connection.requester_id === user.id ? connection.addressee_id : connection.requester_id; const profile = profiles.find((item) => item.id === id); return <div className="glass-card friend-card" key={connection.id}><span className="avatar">{(profile?.display_name || 'A').slice(0, 2).toUpperCase()}</span><span><strong>{profile?.display_name || 'Athlete'}</strong><small>@{profile?.username}</small><p>{profile?.bio}</p></span><button className="friend-status" onClick={() => window.confirm(`Remove ${profile?.display_name || 'this friend'}?`) && perform(() => removeFriend(connection.id), 'Friend removed.')}><UserCheck /> Friends</button></div> })}{!accepted.length && <div className="empty-state glass-card"><Users /><h3>No friends yet</h3><p>Find your training partners below and send a request.</p></div>}</div></div>
        <div className="friend-section"><div className="section-heading"><div><span className="eyebrow">Find your crew</span><h2>Discover athletes</h2></div></div><label className="search-box"><Search /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search name or username" /></label><div className="friend-grid discover-grid">{discoverProfiles.map((profile) => { const connection = relationship(profile.id); const isFriend = connection?.status === 'accepted'; const pendingIn = connection?.status === 'pending' && connection.addressee_id === user.id; return <div className="glass-card friend-card" key={profile.id}><span className="avatar">{profile.display_name.slice(0, 2).toUpperCase()}</span><span><strong>{profile.display_name}</strong><small>@{profile.username}</small><p>{profile.bio}</p></span>{isFriend ? <span className="friend-status static"><UserCheck /> Friends</span> : connection ? <span className="friend-status static">{pendingIn ? 'Requested you' : 'Request sent'}</span> : <button className="secondary-button compact" disabled={busy} onClick={() => perform(() => sendFriendRequest(profile.id), 'Friend request sent.')}><Plus /> Add</button>}</div> })}</div>
        {outgoing.length > 0 && <p className="form-note">You have {outgoing.length} pending friend request{outgoing.length === 1 ? '' : 's'}.</p>}</div>
      </section>}
    </main>
  )
}
