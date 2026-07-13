import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { createDemoData } from '../data/seed'
import { supabase } from '../lib/supabase'
import { useAuth } from './AuthContext'

const DataContext = createContext(null)
const DEMO_KEY = 'velocity-demo-data-v2'
const ACTIVE_KEY = 'velocity-active-workout-v1'

const readJson = (key, fallback) => {
  try {
    const value = localStorage.getItem(key)
    return value ? JSON.parse(value) : fallback
  } catch {
    return fallback
  }
}

const calculateRecords = (sets) => {
  const grouped = new Map()
  sets.forEach((set) => grouped.set(set.exercise_id, [...(grouped.get(set.exercise_id) ?? []), set]))
  return [...grouped.entries()].map(([exerciseId, exerciseSets]) => {
    const bestEstimated = [...exerciseSets].sort((a, b) => {
      const estimateA = Number(a.weight) * (1 + Number(a.reps) / 30)
      const estimateB = Number(b.weight) * (1 + Number(b.reps) / 30)
      return estimateB - estimateA || Number(b.weight) - Number(a.weight)
    })[0]
    const heaviest = [...exerciseSets].sort((a, b) => Number(b.weight) - Number(a.weight) || Number(b.reps) - Number(a.reps))[0]
    return {
      exercise_id: exerciseId,
      best_weight: Number(heaviest.weight),
      best_reps_at_weight: Number(heaviest.reps),
      best_est_1rm: Number(bestEstimated.weight) * (1 + Number(bestEstimated.reps) / 30),
      achieved_at: bestEstimated.created_at,
      set_id: bestEstimated.id,
    }
  })
}

const emptyData = {
  categories: [], exercises: [], sessions: [], sets: [], sessionExercises: [],
  preferences: { unit: 'kg', display_name: 'Athlete' }, profiles: [], friendships: [],
  routines: [], routineDays: [], routineExercises: [], feedPosts: [], postLikes: [], postComments: [],
}

export function DataProvider({ children }) {
  const { user, isDemo } = useAuth()
  const [data, setData] = useState(emptyData)
  const [activeWorkout, setActiveWorkout] = useState(() => readJson(ACTIVE_KEY, null))
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const persistDemo = useCallback((next) => {
    setData(next)
    localStorage.setItem(DEMO_KEY, JSON.stringify(next))
    return next
  }, [])

  const refresh = useCallback(async () => {
    if (!user) return
    setLoading(true)
    setError('')
    try {
      if (isDemo) {
        const saved = readJson(DEMO_KEY, null)
        const next = saved ?? createDemoData()
        if (!saved) localStorage.setItem(DEMO_KEY, JSON.stringify(next))
        setData(next)
      } else {
        const results = await Promise.all([
          supabase.from('categories').select('*').order('sort_order'),
          supabase.from('exercises').select('*').order('name'),
          supabase.from('sessions').select('*').order('started_at', { ascending: false }),
          supabase.from('sets').select('*').order('created_at', { ascending: false }),
          supabase.from('session_exercises').select('*').order('sort_order'),
          supabase.from('user_preferences').select('*').maybeSingle(),
          supabase.from('profiles').select('*').order('display_name'),
          supabase.from('friendships').select('*').order('created_at', { ascending: false }),
          supabase.from('routines').select('*').order('updated_at', { ascending: false }),
          supabase.from('routine_days').select('*').order('sort_order'),
          supabase.from('routine_exercises').select('*').order('sort_order'),
          supabase.from('feed_posts').select('*').order('created_at', { ascending: false }).limit(60),
          supabase.from('post_likes').select('*'),
          supabase.from('post_comments').select('*').order('created_at'),
        ])
        const failed = results.find((result) => result.error)
        if (failed) throw failed.error
        const [categories, exercises, sessions, sets, sessionExercises, preferences, profiles, friendships, routines, routineDays, routineExercises, feedPosts, postLikes, postComments] = results
        setData({
          categories: categories.data ?? [], exercises: exercises.data ?? [], sessions: sessions.data ?? [],
          sets: sets.data ?? [], sessionExercises: sessionExercises.data ?? [],
          preferences: preferences.data ?? { unit: 'kg', display_name: user.user_metadata?.display_name || 'Athlete' },
          profiles: profiles.data ?? [], friendships: friendships.data ?? [], routines: routines.data ?? [],
          routineDays: routineDays.data ?? [], routineExercises: routineExercises.data ?? [],
          feedPosts: feedPosts.data ?? [], postLikes: postLikes.data ?? [], postComments: postComments.data ?? [],
        })
      }
    } catch (caught) {
      setError(caught.message || 'Could not load workout data.')
    } finally {
      setLoading(false)
    }
  }, [isDemo, user])

  useEffect(() => { refresh() }, [refresh])

  const runRemote = async (query, refreshAfter = true) => {
    const result = await query
    if (result.error) throw result.error
    if (refreshAfter) await refresh()
    return result.data
  }

  const addCategory = async (name) => {
    const cleanName = name.trim()
    if (!cleanName) return
    if (isDemo) return persistDemo({ ...data, categories: [...data.categories, { id: crypto.randomUUID(), name: cleanName, sort_order: data.categories.length, is_archived: false }] })
    return runRemote(supabase.from('categories').insert({ user_id: user.id, name: cleanName, sort_order: data.categories.length }))
  }

  const updateCategory = async (id, updates) => {
    if (isDemo) return persistDemo({ ...data, categories: data.categories.map((item) => item.id === id ? { ...item, ...updates } : item) })
    return runRemote(supabase.from('categories').update(updates).eq('id', id))
  }

  const moveCategory = async (id, direction) => {
    const active = data.categories.filter((item) => !item.is_archived).sort((a, b) => a.sort_order - b.sort_order)
    const index = active.findIndex((item) => item.id === id)
    const swapIndex = index + direction
    if (index < 0 || swapIndex < 0 || swapIndex >= active.length) return
    const reordered = [...active]
    ;[reordered[index], reordered[swapIndex]] = [reordered[swapIndex], reordered[index]]
    if (isDemo) {
      const order = new Map(reordered.map((item, orderIndex) => [item.id, orderIndex]))
      return persistDemo({ ...data, categories: data.categories.map((item) => order.has(item.id) ? { ...item, sort_order: order.get(item.id) } : item) })
    }
    const results = await Promise.all(reordered.map((item, sort_order) => supabase.from('categories').update({ sort_order }).eq('id', item.id)))
    const failed = results.find((result) => result.error)
    if (failed) throw failed.error
    await refresh()
  }

  const archiveCategory = async (id, destination) => {
    if (isDemo) {
      return persistDemo({
        ...data,
        categories: data.categories.map((item) => item.id === id ? { ...item, is_archived: true } : item),
        exercises: data.exercises.map((item) => item.category_id !== id ? item : destination === 'archive' ? { ...item, is_archived: true } : { ...item, category_id: destination }),
      })
    }
    if (destination === 'archive') {
      const result = await supabase.from('exercises').update({ is_archived: true }).eq('category_id', id)
      if (result.error) throw result.error
    } else if (destination) {
      const result = await supabase.from('exercises').update({ category_id: destination }).eq('category_id', id)
      if (result.error) throw result.error
    }
    return runRemote(supabase.from('categories').update({ is_archived: true }).eq('id', id))
  }

  const saveExercise = async (exercise) => {
    const payload = { name: exercise.name.trim(), category_id: exercise.category_id, unit: exercise.unit, is_bodyweight: exercise.is_bodyweight }
    if (isDemo) {
      const exercises = exercise.id ? data.exercises.map((item) => item.id === exercise.id ? { ...item, ...payload } : item) : [...data.exercises, { ...payload, id: crypto.randomUUID(), is_archived: false }]
      return persistDemo({ ...data, exercises })
    }
    return exercise.id ? runRemote(supabase.from('exercises').update(payload).eq('id', exercise.id)) : runRemote(supabase.from('exercises').insert({ ...payload, user_id: user.id }))
  }

  const archiveExercise = async (id) => {
    if (isDemo) return persistDemo({ ...data, exercises: data.exercises.map((item) => item.id === id ? { ...item, is_archived: true } : item) })
    return runRemote(supabase.from('exercises').update({ is_archived: true }).eq('id', id))
  }

  const startWorkout = async (categoryId, exerciseIds, options = {}) => {
    let sessionId
    if (isDemo) {
      sessionId = crypto.randomUUID()
      const session = { id: sessionId, category_id: categoryId, started_at: new Date().toISOString(), ended_at: null, notes: '' }
      const sessionExercises = exerciseIds.map((exercise_id, sort_order) => ({ id: crypto.randomUUID(), session_id: sessionId, exercise_id, sort_order }))
      persistDemo({ ...data, sessions: [session, ...data.sessions], sessionExercises: [...data.sessionExercises, ...sessionExercises] })
    } else {
      const { data: session, error: sessionError } = await supabase.from('sessions').insert({ user_id: user.id, category_id: categoryId }).select().single()
      if (sessionError) throw sessionError
      sessionId = session.id
      const rows = exerciseIds.map((exercise_id, sort_order) => ({ user_id: user.id, session_id: sessionId, exercise_id, sort_order }))
      const { error: exerciseError } = await supabase.from('session_exercises').insert(rows)
      if (exerciseError) throw exerciseError
      await refresh()
    }
    const active = { sessionId, categoryId, exerciseIds, startedAt: new Date().toISOString(), routineDayId: options.routineDayId ?? null, targets: options.targets ?? {} }
    setActiveWorkout(active)
    localStorage.setItem(ACTIVE_KEY, JSON.stringify(active))
    return active
  }

  const startPlannedWorkout = async (routineDayId) => {
    const day = data.routineDays.find((item) => item.id === routineDayId)
    const routine = data.routines.find((item) => item.id === day?.routine_id)
    if (!day || routine?.user_id !== user.id) throw new Error('Only your own routine days can be started.')
    const planned = data.routineExercises.filter((item) => item.routine_day_id === routineDayId).sort((a, b) => a.sort_order - b.sort_order)
    const matched = planned.map((item) => ({ item, exercise: data.exercises.find((exercise) => exercise.id === item.exercise_id) ?? data.exercises.find((exercise) => exercise.name.toLowerCase() === item.exercise_name.toLowerCase() && !exercise.is_archived) })).filter((item) => item.exercise)
    if (!matched.length) throw new Error('Add at least one available exercise to this day.')
    if (new Set(matched.map(({ exercise }) => exercise.id)).size !== matched.length) throw new Error('Remove duplicate exercises from this routine day before starting.')
    const targets = Object.fromEntries(matched.map(({ item, exercise }) => [exercise.id, {
      targetSets: item.target_sets, repsMin: item.target_reps_min, repsMax: item.target_reps_max,
      weight: item.target_weight, restSeconds: item.rest_seconds, notes: item.notes,
    }]))
    return startWorkout(matched[0].exercise.category_id, matched.map(({ exercise }) => exercise.id), { routineDayId, targets })
  }

  const logSet = async ({ exerciseId, reps, weight }) => {
    if (!activeWorkout) throw new Error('No workout is active.')
    const existing = data.sets.filter((item) => item.session_id === activeWorkout.sessionId && item.exercise_id === exerciseId)
    const row = { id: crypto.randomUUID(), session_id: activeWorkout.sessionId, exercise_id: exerciseId, set_number: existing.length + 1, reps: Number(reps), weight: Number(weight), created_at: new Date().toISOString() }
    if (isDemo) {
      const previous = calculateRecords(data.sets).find((item) => item.exercise_id === exerciseId)
      const estimated = row.weight * (1 + row.reps / 30)
      row.is_pr = !previous || estimated > previous.best_est_1rm || row.weight > previous.best_weight
      persistDemo({ ...data, sets: [row, ...data.sets] })
      return row
    }
    const { data: inserted, error: insertError } = await supabase.from('sets').insert({ ...row, id: undefined, user_id: user.id }).select().single()
    if (insertError) throw insertError
    await refresh()
    const { data: saved } = await supabase.from('sets').select('*').eq('id', inserted.id).single()
    return saved ?? inserted
  }

  const deleteSet = async (id) => {
    if (isDemo) return persistDemo({ ...data, sets: data.sets.filter((item) => item.id !== id) })
    return runRemote(supabase.from('sets').delete().eq('id', id))
  }

  const endWorkout = async (cancel = false, notes = '') => {
    if (!activeWorkout) return null
    const sessionId = activeWorkout.sessionId
    if (isDemo) {
      persistDemo(cancel
        ? { ...data, sessions: data.sessions.filter((item) => item.id !== sessionId), sets: data.sets.filter((item) => item.session_id !== sessionId), sessionExercises: data.sessionExercises.filter((item) => item.session_id !== sessionId) }
        : { ...data, sessions: data.sessions.map((item) => item.id === sessionId ? { ...item, ended_at: new Date().toISOString(), notes } : item) })
    } else if (cancel) {
      const result = await supabase.from('sessions').delete().eq('id', sessionId)
      if (result.error) throw result.error
      await refresh()
    } else {
      await runRemote(supabase.from('sessions').update({ ended_at: new Date().toISOString(), notes }).eq('id', sessionId))
    }
    setActiveWorkout(null)
    localStorage.removeItem(ACTIVE_KEY)
    return sessionId
  }

  const updatePreferences = async (updates) => {
    const next = { ...data.preferences, ...updates }
    if (isDemo) return persistDemo({ ...data, preferences: next })
    return runRemote(supabase.from('user_preferences').upsert({ ...next, user_id: user.id }))
  }

  const saveProfile = async ({ username, display_name, bio, unit = data.preferences.unit || 'kg' }) => {
    const profile = { id: user.id, username: username.trim().toLowerCase(), display_name: display_name.trim(), bio: bio.trim(), updated_at: new Date().toISOString() }
    if (isDemo) return persistDemo({ ...data, profiles: data.profiles.map((item) => item.id === user.id ? { ...item, ...profile } : item), preferences: { ...data.preferences, display_name: profile.display_name, unit } })
    const [profileResult, preferenceResult] = await Promise.all([
      supabase.from('profiles').upsert(profile),
      supabase.from('user_preferences').upsert({ user_id: user.id, display_name: profile.display_name, unit }),
    ])
    if (profileResult.error) throw profileResult.error
    if (preferenceResult.error) throw preferenceResult.error
    await refresh()
  }

  const sendFriendRequest = async (profileId) => {
    if (profileId === user.id) return
    if (data.friendships.some((item) => [item.requester_id, item.addressee_id].includes(profileId))) throw new Error('A friendship or request already exists.')
    const row = { id: crypto.randomUUID(), requester_id: user.id, addressee_id: profileId, status: 'pending', created_at: new Date().toISOString() }
    if (isDemo) return persistDemo({ ...data, friendships: [row, ...data.friendships] })
    return runRemote(supabase.from('friendships').insert({ requester_id: user.id, addressee_id: profileId }))
  }

  const respondToFriendRequest = async (friendshipId, accept) => {
    if (isDemo) return persistDemo({ ...data, friendships: accept ? data.friendships.map((item) => item.id === friendshipId ? { ...item, status: 'accepted', accepted_at: new Date().toISOString() } : item) : data.friendships.filter((item) => item.id !== friendshipId) })
    return accept ? runRemote(supabase.from('friendships').update({ status: 'accepted' }).eq('id', friendshipId)) : runRemote(supabase.from('friendships').delete().eq('id', friendshipId))
  }

  const removeFriend = async (friendshipId) => {
    if (isDemo) return persistDemo({ ...data, friendships: data.friendships.filter((item) => item.id !== friendshipId) })
    return runRemote(supabase.from('friendships').delete().eq('id', friendshipId))
  }

  const saveRoutine = async (routine) => {
    const routinePayload = { name: routine.name.trim(), description: routine.description?.trim() ?? '', is_shared: Boolean(routine.is_shared), updated_at: new Date().toISOString() }
    if (!routinePayload.name) throw new Error('Routine name is required.')
    if (!routine.days?.length) throw new Error('Add at least one training day.')
    if (isDemo) {
      const routineId = routine.id ?? crypto.randomUUID()
      const existingDayIds = data.routineDays.filter((item) => item.routine_id === routineId).map((item) => item.id)
      const newDays = []
      const newExercises = []
      routine.days.forEach((day, sort_order) => {
        const dayId = day.id && !existingDayIds.includes(day.id) ? day.id : crypto.randomUUID()
        newDays.push({ id: dayId, user_id: user.id, routine_id: routineId, name: day.name.trim(), weekday: day.weekday === '' || day.weekday == null ? null : Number(day.weekday), sort_order })
        day.exercises.forEach((planned, exerciseOrder) => {
          const exercise = data.exercises.find((item) => item.id === planned.exercise_id)
          newExercises.push({ id: crypto.randomUUID(), user_id: user.id, routine_day_id: dayId, exercise_id: planned.exercise_id, exercise_name: exercise?.name ?? planned.exercise_name, unit: exercise?.unit ?? planned.unit ?? 'kg', target_sets: Number(planned.target_sets), target_reps_min: Number(planned.target_reps_min), target_reps_max: Number(planned.target_reps_max), target_weight: planned.target_weight === '' ? null : Number(planned.target_weight), rest_seconds: Number(planned.rest_seconds), notes: planned.notes ?? '', sort_order: exerciseOrder })
        })
      })
      return persistDemo({ ...data, routines: [...data.routines.filter((item) => item.id !== routineId), { id: routineId, user_id: user.id, ...routinePayload }], routineDays: [...data.routineDays.filter((item) => item.routine_id !== routineId), ...newDays], routineExercises: [...data.routineExercises.filter((item) => !existingDayIds.includes(item.routine_day_id)), ...newExercises] })
    }
    let routineId = routine.id
    if (routineId) {
      const result = await supabase.from('routines').update(routinePayload).eq('id', routineId).eq('user_id', user.id)
      if (result.error) throw result.error
      const deleteResult = await supabase.from('routine_days').delete().eq('routine_id', routineId)
      if (deleteResult.error) throw deleteResult.error
    } else {
      const result = await supabase.from('routines').insert({ ...routinePayload, user_id: user.id }).select().single()
      if (result.error) throw result.error
      routineId = result.data.id
    }
    for (let sort_order = 0; sort_order < routine.days.length; sort_order += 1) {
      const day = routine.days[sort_order]
      const dayResult = await supabase.from('routine_days').insert({ user_id: user.id, routine_id: routineId, name: day.name.trim(), weekday: day.weekday === '' || day.weekday == null ? null : Number(day.weekday), sort_order }).select().single()
      if (dayResult.error) throw dayResult.error
      const rows = day.exercises.map((planned, exerciseOrder) => {
        const exercise = data.exercises.find((item) => item.id === planned.exercise_id)
        return { user_id: user.id, routine_day_id: dayResult.data.id, exercise_id: planned.exercise_id, exercise_name: exercise?.name ?? planned.exercise_name, unit: exercise?.unit ?? planned.unit ?? 'kg', target_sets: Number(planned.target_sets), target_reps_min: Number(planned.target_reps_min), target_reps_max: Number(planned.target_reps_max), target_weight: planned.target_weight === '' ? null : Number(planned.target_weight), rest_seconds: Number(planned.rest_seconds), notes: planned.notes ?? '', sort_order: exerciseOrder }
      })
      if (rows.length) {
        const exerciseResult = await supabase.from('routine_exercises').insert(rows)
        if (exerciseResult.error) throw exerciseResult.error
      }
    }
    await refresh()
    return routineId
  }

  const deleteRoutine = async (routineId) => {
    if (isDemo) {
      const dayIds = data.routineDays.filter((item) => item.routine_id === routineId).map((item) => item.id)
      return persistDemo({ ...data, routines: data.routines.filter((item) => item.id !== routineId), routineDays: data.routineDays.filter((item) => item.routine_id !== routineId), routineExercises: data.routineExercises.filter((item) => !dayIds.includes(item.routine_day_id)) })
    }
    return runRemote(supabase.from('routines').delete().eq('id', routineId))
  }

  const createPost = async ({ post_type = 'status', caption = '', visibility = 'friends', routine_id = null, metadata = {} }) => {
    const row = { id: crypto.randomUUID(), user_id: user.id, post_type, caption: caption.trim(), visibility, routine_id, metadata, created_at: new Date().toISOString() }
    if (isDemo) return persistDemo({ ...data, feedPosts: [row, ...data.feedPosts] })
    return runRemote(supabase.from('feed_posts').insert({ user_id: user.id, post_type, caption: row.caption, visibility, routine_id, metadata }))
  }

  const shareRoutine = async (routineId, caption = '') => {
    const routine = data.routines.find((item) => item.id === routineId && item.user_id === user.id)
    if (!routine) throw new Error('Routine not found.')
    const days = data.routineDays.filter((item) => item.routine_id === routineId)
    const dayIds = days.map((item) => item.id)
    const exerciseCount = data.routineExercises.filter((item) => dayIds.includes(item.routine_day_id)).length
    if (isDemo) {
      const next = { ...data, routines: data.routines.map((item) => item.id === routineId ? { ...item, is_shared: true } : item) }
      const row = { id: crypto.randomUUID(), user_id: user.id, post_type: 'routine', caption: caption.trim(), visibility: 'friends', routine_id: routineId, metadata: { routine_name: routine.name, day_count: days.length, exercise_count: exerciseCount }, created_at: new Date().toISOString() }
      return persistDemo({ ...next, feedPosts: [row, ...next.feedPosts] })
    }
    const updateResult = await supabase.from('routines').update({ is_shared: true, updated_at: new Date().toISOString() }).eq('id', routineId)
    if (updateResult.error) throw updateResult.error
    return runRemote(supabase.from('feed_posts').insert({ user_id: user.id, post_type: 'routine', caption: caption.trim(), visibility: 'friends', routine_id: routineId, metadata: { routine_name: routine.name, day_count: days.length, exercise_count: exerciseCount } }))
  }

  const shareProgress = async (sessionId, caption = '') => {
    const session = data.sessions.find((item) => item.id === sessionId)
    const sessionSets = data.sets.filter((item) => item.session_id === sessionId)
    if (!session || !sessionSets.length) throw new Error('Log at least one set before sharing progress.')
    const exerciseIds = [...new Set(sessionSets.map((item) => item.exercise_id))]
    const metadata = {
      category_name: data.categories.find((item) => item.id === session.category_id)?.name ?? 'Workout',
      set_count: sessionSets.length,
      exercise_count: exerciseIds.length,
      exercise_names: exerciseIds.map((id) => data.exercises.find((item) => item.id === id)?.name).filter(Boolean).slice(0, 8),
      total_volume: Math.round(sessionSets.reduce((sum, item) => sum + Number(item.weight) * Number(item.reps), 0)),
      pr_count: sessionSets.filter((item) => item.is_pr).length,
    }
    return createPost({ post_type: 'workout', caption, metadata })
  }

  const toggleLike = async (postId) => {
    const liked = data.postLikes.some((item) => item.post_id === postId && item.user_id === user.id)
    if (isDemo) return persistDemo({ ...data, postLikes: liked ? data.postLikes.filter((item) => !(item.post_id === postId && item.user_id === user.id)) : [...data.postLikes, { post_id: postId, user_id: user.id, created_at: new Date().toISOString() }] })
    return liked ? runRemote(supabase.from('post_likes').delete().eq('post_id', postId).eq('user_id', user.id)) : runRemote(supabase.from('post_likes').insert({ post_id: postId, user_id: user.id }))
  }

  const addComment = async (postId, body) => {
    const cleanBody = body.trim()
    if (!cleanBody) return
    if (isDemo) return persistDemo({ ...data, postComments: [...data.postComments, { id: crypto.randomUUID(), post_id: postId, user_id: user.id, body: cleanBody, created_at: new Date().toISOString() }] })
    return runRemote(supabase.from('post_comments').insert({ post_id: postId, user_id: user.id, body: cleanBody }))
  }

  const deletePost = async (postId) => {
    if (isDemo) return persistDemo({ ...data, feedPosts: data.feedPosts.filter((item) => item.id !== postId), postLikes: data.postLikes.filter((item) => item.post_id !== postId), postComments: data.postComments.filter((item) => item.post_id !== postId) })
    return runRemote(supabase.from('feed_posts').delete().eq('id', postId))
  }

  const copyRoutine = async (routineId) => {
    const source = data.routines.find((item) => item.id === routineId && item.user_id !== user.id && item.is_shared)
    if (!source) throw new Error('This shared routine is no longer available.')
    const sourceDays = data.routineDays.filter((item) => item.routine_id === routineId).sort((a, b) => a.sort_order - b.sort_order)
    const localExercises = [...data.exercises]
    let categoryId = data.categories.find((item) => !item.is_archived)?.id
    if (!categoryId && !isDemo) {
      const result = await supabase.from('categories').insert({ user_id: user.id, name: 'Imported', sort_order: 0 }).select().single()
      if (result.error) throw result.error
      categoryId = result.data.id
    }
    const days = []
    for (const day of sourceDays) {
      const sourceExercises = data.routineExercises.filter((item) => item.routine_day_id === day.id).sort((a, b) => a.sort_order - b.sort_order)
      const copiedExercises = []
      for (const planned of sourceExercises) {
        let local = localExercises.find((item) => item.name.toLowerCase() === planned.exercise_name.toLowerCase() && !item.is_archived)
        if (!local && isDemo) {
          local = { id: crypto.randomUUID(), category_id: categoryId, name: planned.exercise_name, unit: planned.unit, is_bodyweight: planned.unit === 'reps' || planned.unit === 'seconds', is_archived: false }
          localExercises.push(local)
        } else if (!local) {
          const result = await supabase.from('exercises').insert({ user_id: user.id, category_id: categoryId, name: planned.exercise_name, unit: planned.unit, is_bodyweight: planned.unit === 'reps' || planned.unit === 'seconds' }).select().single()
          if (result.error) throw result.error
          local = result.data
          localExercises.push(local)
        }
        copiedExercises.push({ ...planned, id: undefined, exercise_id: local.id })
      }
      days.push({ ...day, id: undefined, exercises: copiedExercises })
    }
    const copied = await saveRoutine({ name: `${source.name} (Copy)`, description: source.description, is_shared: false, days })
    if (isDemo) return persistDemo({ ...copied, exercises: localExercises })
    return copied
  }

  const resetDemo = () => {
    const next = createDemoData()
    persistDemo(next)
    setActiveWorkout(null)
    localStorage.removeItem(ACTIVE_KEY)
  }

  const records = useMemo(() => calculateRecords(data.sets), [data.sets])
  const value = {
    ...data, records, activeWorkout, loading, error, refresh,
    addCategory, updateCategory, moveCategory, archiveCategory, saveExercise, archiveExercise,
    startWorkout, startPlannedWorkout, logSet, deleteSet, endWorkout, updatePreferences,
    saveProfile, sendFriendRequest, respondToFriendRequest, removeFriend,
    saveRoutine, deleteRoutine, shareRoutine, shareProgress, createPost, toggleLike, addComment, deletePost, copyRoutine, resetDemo,
  }

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>
}

export const useData = () => useContext(DataContext)
