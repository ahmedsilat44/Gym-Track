import { ArrowLeft, CalendarDays, Check, Copy, Dumbbell, Edit3, MessageCircle, Share2, UserCheck, UserPlus } from 'lucide-react'
import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useData } from '../context/DataContext'

const timeAgo = (value) => {
  const seconds = Math.max(1, Math.floor((Date.now() - new Date(value).getTime()) / 1000))
  if (seconds < 60) return 'just now'
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`
  return new Date(value).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}

export default function Profile() {
  const navigate = useNavigate()
  const { profileId } = useParams()
  const { user } = useAuth()
  const {
    profiles, friendships, feedPosts, postLikes, postComments, routines, routineDays, routineExercises,
    sendFriendRequest, respondToFriendRequest, copyRoutine,
  } = useData()
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState('')
  const [error, setError] = useState('')

  const targetId = profileId || user.id
  const profile = profiles.find((item) => item.id === targetId)
  const isOwnProfile = targetId === user.id
  const relationship = friendships.find((item) => [item.requester_id, item.addressee_id].includes(targetId) && item.requester_id !== item.addressee_id)
  const isFriend = relationship?.status === 'accepted'
  const incomingRequest = relationship?.status === 'pending' && relationship.addressee_id === user.id
  const profilePosts = feedPosts.filter((post) => post.user_id === targetId)
  const recentPosts = profilePosts.slice(0, 8)
  const publishedWorkouts = profilePosts.filter((post) => post.post_type === 'workout')
  const publishedRoutines = routines.filter((routine) => routine.user_id === targetId && (routine.visibility ?? (routine.is_shared ? 'friends' : 'private')) !== 'private')

  const perform = async (action, message) => {
    setBusy(true)
    setError('')
    try {
      await action()
      setNotice(message)
      window.setTimeout(() => setNotice(''), 2600)
    } catch (caught) {
      setError(caught.message || 'Something went wrong.')
    } finally {
      setBusy(false)
    }
  }

  if (!profile) {
    return <main className="content-page profile-page"><header className="page-header compact-header"><button className="icon-button" onClick={() => navigate(-1)} aria-label="Go back"><ArrowLeft /></button><div><span className="eyebrow">Athlete profile</span><h1>Profile unavailable</h1></div><span /></header><div className="empty-state glass-card"><UserPlus /><h3>This athlete was not found</h3><p>The account may have been removed or is not part of this network.</p></div></main>
  }

  const relationshipAction = isOwnProfile
    ? <button className="primary-button compact" onClick={() => navigate('/settings')}><Edit3 /> Edit profile</button>
    : isFriend
      ? <span className="profile-relationship"><UserCheck /> Friends</span>
      : incomingRequest
        ? <button className="primary-button compact" disabled={busy} onClick={() => perform(() => respondToFriendRequest(relationship.id, true), 'Friend request accepted.')}><Check /> Accept request</button>
        : relationship
          ? <span className="profile-relationship pending">Request pending</span>
          : <button className="secondary-button compact" disabled={busy} onClick={() => perform(() => sendFriendRequest(targetId), 'Friend request sent.')}><UserPlus /> Add friend</button>

  return (
    <main className="content-page profile-page">
      <header className="profile-page-nav"><button className="icon-button" onClick={() => navigate(-1)} aria-label="Go back"><ArrowLeft /></button><span className="eyebrow">Athlete profile</span><span /></header>
      {notice && <div className="notice-toast" role="status"><Check /> {notice}</div>}
      {error && <p className="form-error">{error}</p>}

      <section className="glass-card profile-hero">
        <div className="avatar profile-avatar">{profile.display_name.slice(0, 2).toUpperCase()}</div>
        <div className="profile-hero-copy"><span className="eyebrow">@{profile.username}</span><h1>{profile.display_name}</h1><p>{profile.bio || 'Training, progressing, and sharing the journey.'}</p></div>
        <div className="profile-hero-action">{relationshipAction}</div>
        <div className="profile-stats"><span><strong>{profilePosts.length}</strong><small>Visible posts</small></span><span><strong>{publishedWorkouts.length}</strong><small>Workouts</small></span><span><strong>{publishedRoutines.length}</strong><small>Routines</small></span></div>
      </section>

      <div className="profile-content-grid">
        <section className="profile-feed-section">
          <div className="section-heading"><div><span className="eyebrow">Latest updates</span><h2>Recent posts</h2></div><span className="count-pill">{recentPosts.length}</span></div>
          <div className="profile-feed-list">{recentPosts.map((post) => {
            const meta = post.metadata || {}
            const likes = postLikes.filter((item) => item.post_id === post.id).length
            const comments = postComments.filter((item) => item.post_id === post.id).length
            return <article className="glass-card profile-post" key={post.id}><header><span className={`profile-post-type ${post.post_type}`}><span>{post.post_type === 'workout' ? <Dumbbell /> : post.post_type === 'routine' ? <Share2 /> : <MessageCircle />}</span>{post.post_type}</span><span><i className={`post-visibility ${post.visibility}`}>{post.visibility === 'public' ? 'Public' : 'Friends'}</i><small>{timeAgo(post.created_at)}</small></span></header>{post.caption && <p>{post.caption}</p>}{post.post_type === 'workout' && <div className="profile-post-summary"><strong>{meta.category_name || 'Completed workout'}</strong><small>{meta.exercise_count || 0} exercises · {meta.set_count || 0} sets · {Number(meta.total_volume || 0).toLocaleString()} volume</small></div>}{post.post_type === 'routine' && <div className="profile-post-summary"><strong>{meta.routine_name || 'Shared routine'}</strong><small>{meta.day_count || 0} days · {meta.exercise_count || 0} planned exercises</small></div>}<footer><span>{likes} like{likes === 1 ? '' : 's'}</span><span>{comments} comment{comments === 1 ? '' : 's'}</span></footer></article>
          })}{!recentPosts.length && <div className="empty-state glass-card"><MessageCircle /><h3>No recent posts</h3><p>{isOwnProfile ? 'Your social posts will appear here.' : 'This athlete has not published an update you can see.'}</p></div>}</div>
        </section>

        <section className="profile-published-section">
          <div className="section-heading"><div><span className="eyebrow">Training library</span><h2>Published workouts</h2></div><span className="count-pill">{publishedWorkouts.length + publishedRoutines.length}</span></div>
          <div className="published-workout-list">
            {publishedRoutines.map((routine) => {
              const days = routineDays.filter((day) => day.routine_id === routine.id)
              const dayIds = days.map((day) => day.id)
              const exerciseCount = routineExercises.filter((exercise) => dayIds.includes(exercise.routine_day_id)).length
              return <article className="glass-card published-workout-card routine" key={routine.id}><header><span><CalendarDays /></span><i>{routine.visibility === 'public' ? 'Public routine' : 'Friends routine'}</i></header><h3>{routine.name}</h3><p>{routine.description || 'A repeatable workout plan.'}</p><small>{days.length} training days · {exerciseCount} exercises</small>{!isOwnProfile && <button className="secondary-button compact" disabled={busy} onClick={() => perform(async () => { await copyRoutine(routine.id); navigate('/planner') }, 'Routine copied to your planner.')}><Copy /> Copy routine</button>}</article>
            })}
            {publishedWorkouts.map((post) => { const meta = post.metadata || {}; return <article className="glass-card published-workout-card" key={post.id}><header><span><Dumbbell /></span><i>{timeAgo(post.created_at)}</i></header><h3>{meta.category_name || 'Completed workout'}</h3><p>{post.caption || (meta.exercise_names || []).join(', ') || 'Workout summary'}</p><small>{meta.exercise_count || 0} exercises · {meta.set_count || 0} sets · {Number(meta.total_volume || 0).toLocaleString()} volume{meta.pr_count ? ` · ${meta.pr_count} PR` : ''}</small></article> })}
            {!publishedWorkouts.length && !publishedRoutines.length && <div className="empty-state glass-card"><Dumbbell /><h3>No published workouts</h3><p>{isOwnProfile ? 'Share a workout summary or routine to feature it here.' : 'This athlete has not published a workout you can see.'}</p></div>}
          </div>
        </section>
      </div>
    </main>
  )
}
