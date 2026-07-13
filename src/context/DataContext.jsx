import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { createDemoData } from '../data/seed'
import { supabase } from '../lib/supabase'
import { useAuth } from './AuthContext'

const DataContext = createContext(null)
const DEMO_KEY = 'velocity-demo-data-v1'
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

const emptyData = { categories: [], exercises: [], sessions: [], sets: [], sessionExercises: [], preferences: { unit: 'kg', display_name: 'Athlete' } }

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
        const [categories, exercises, sessions, sets, sessionExercises, preferences] = await Promise.all([
          supabase.from('categories').select('*').order('sort_order'),
          supabase.from('exercises').select('*').order('name'),
          supabase.from('sessions').select('*').order('started_at', { ascending: false }),
          supabase.from('sets').select('*').order('created_at', { ascending: false }),
          supabase.from('session_exercises').select('*').order('sort_order'),
          supabase.from('user_preferences').select('*').maybeSingle(),
        ])
        const failed = [categories, exercises, sessions, sets, sessionExercises, preferences].find((result) => result.error)
        if (failed) throw failed.error
        setData({
          categories: categories.data ?? [],
          exercises: exercises.data ?? [],
          sessions: sessions.data ?? [],
          sets: sets.data ?? [],
          sessionExercises: sessionExercises.data ?? [],
          preferences: preferences.data ?? { unit: 'kg', display_name: user.user_metadata?.display_name || 'Athlete' },
        })
      }
    } catch (caught) {
      setError(caught.message || 'Could not load workout data.')
    } finally {
      setLoading(false)
    }
  }, [isDemo, user])

  useEffect(() => {
    refresh()
  }, [refresh])

  const runRemote = async (query) => {
    const result = await query
    if (result.error) throw result.error
    await refresh()
    return result.data
  }

  const addCategory = async (name) => {
    const cleanName = name.trim()
    if (!cleanName) return
    if (isDemo) {
      return persistDemo({ ...data, categories: [...data.categories, { id: crypto.randomUUID(), name: cleanName, sort_order: data.categories.length, is_archived: false }] })
    }
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
    const updates = reordered.map((item, sort_order) => supabase.from('categories').update({ sort_order }).eq('id', item.id))
    const results = await Promise.all(updates)
    const failed = results.find((result) => result.error)
    if (failed) throw failed.error
    await refresh()
  }

  const archiveCategory = async (id, destination) => {
    if (isDemo) {
      return persistDemo({
        ...data,
        categories: data.categories.map((item) => item.id === id ? { ...item, is_archived: true } : item),
        exercises: data.exercises.map((item) => item.category_id !== id ? item : destination === 'archive'
          ? { ...item, is_archived: true }
          : { ...item, category_id: destination }),
      })
    }
    if (destination === 'archive') {
      const exerciseResult = await supabase.from('exercises').update({ is_archived: true }).eq('category_id', id)
      if (exerciseResult.error) throw exerciseResult.error
    } else if (destination) {
      const exerciseResult = await supabase.from('exercises').update({ category_id: destination }).eq('category_id', id)
      if (exerciseResult.error) throw exerciseResult.error
    }
    return runRemote(supabase.from('categories').update({ is_archived: true }).eq('id', id))
  }

  const saveExercise = async (exercise) => {
    const payload = {
      name: exercise.name.trim(),
      category_id: exercise.category_id,
      unit: exercise.unit,
      is_bodyweight: exercise.is_bodyweight,
    }
    if (isDemo) {
      const exercises = exercise.id
        ? data.exercises.map((item) => item.id === exercise.id ? { ...item, ...payload } : item)
        : [...data.exercises, { ...payload, id: crypto.randomUUID(), is_archived: false }]
      return persistDemo({ ...data, exercises })
    }
    return exercise.id
      ? runRemote(supabase.from('exercises').update(payload).eq('id', exercise.id))
      : runRemote(supabase.from('exercises').insert({ ...payload, user_id: user.id }))
  }

  const archiveExercise = async (id) => {
    if (isDemo) return persistDemo({ ...data, exercises: data.exercises.map((item) => item.id === id ? { ...item, is_archived: true } : item) })
    return runRemote(supabase.from('exercises').update({ is_archived: true }).eq('id', id))
  }

  const startWorkout = async (categoryId, exerciseIds) => {
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
    const active = { sessionId, categoryId, exerciseIds, startedAt: new Date().toISOString() }
    setActiveWorkout(active)
    localStorage.setItem(ACTIVE_KEY, JSON.stringify(active))
    return active
  }

  const logSet = async ({ exerciseId, reps, weight }) => {
    if (!activeWorkout) throw new Error('No workout is active.')
    const existing = data.sets.filter((item) => item.session_id === activeWorkout.sessionId && item.exercise_id === exerciseId)
    const row = {
      id: crypto.randomUUID(),
      session_id: activeWorkout.sessionId,
      exercise_id: exerciseId,
      set_number: existing.length + 1,
      reps: Number(reps),
      weight: Number(weight),
      created_at: new Date().toISOString(),
    }
    if (isDemo) {
      const previous = calculateRecords(data.sets).find((item) => item.exercise_id === exerciseId)
      const estimated = row.weight * (1 + row.reps / 30)
      row.is_pr = !previous || estimated > previous.best_est_1rm || row.weight > previous.best_weight
      persistDemo({ ...data, sets: [row, ...data.sets] })
      return row
    }
    const remoteRow = {
      session_id: row.session_id,
      exercise_id: row.exercise_id,
      set_number: row.set_number,
      reps: row.reps,
      weight: row.weight,
      created_at: row.created_at,
    }
    const { data: inserted, error: insertError } = await supabase.from('sets').insert({ ...remoteRow, user_id: user.id }).select().single()
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
    if (!activeWorkout) return
    if (isDemo) {
      persistDemo(cancel
        ? { ...data, sessions: data.sessions.filter((item) => item.id !== activeWorkout.sessionId), sets: data.sets.filter((item) => item.session_id !== activeWorkout.sessionId), sessionExercises: data.sessionExercises.filter((item) => item.session_id !== activeWorkout.sessionId) }
        : { ...data, sessions: data.sessions.map((item) => item.id === activeWorkout.sessionId ? { ...item, ended_at: new Date().toISOString(), notes } : item) })
    } else if (cancel) {
      const result = await supabase.from('sessions').delete().eq('id', activeWorkout.sessionId)
      if (result.error) throw result.error
      await refresh()
    } else {
      await runRemote(supabase.from('sessions').update({ ended_at: new Date().toISOString(), notes }).eq('id', activeWorkout.sessionId))
    }
    setActiveWorkout(null)
    localStorage.removeItem(ACTIVE_KEY)
  }

  const updatePreferences = async (updates) => {
    const next = { ...data.preferences, ...updates }
    if (isDemo) return persistDemo({ ...data, preferences: next })
    return runRemote(supabase.from('user_preferences').upsert({ ...next, user_id: user.id }))
  }

  const resetDemo = () => {
    const next = createDemoData()
    persistDemo(next)
    setActiveWorkout(null)
    localStorage.removeItem(ACTIVE_KEY)
  }

  const records = useMemo(() => calculateRecords(data.sets), [data.sets])
  const value = {
    ...data,
    records,
    activeWorkout,
    loading,
    error,
    refresh,
    addCategory,
    updateCategory,
    moveCategory,
    archiveCategory,
    saveExercise,
    archiveExercise,
    startWorkout,
    logSet,
    deleteSet,
    endWorkout,
    updatePreferences,
    resetDemo,
  }

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>
}

export const useData = () => useContext(DataContext)
