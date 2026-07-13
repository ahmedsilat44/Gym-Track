const isoDaysAgo = (days, hour = 18) => {
  const date = new Date()
  date.setDate(date.getDate() - days)
  date.setHours(hour, 0, 0, 0)
  return date.toISOString()
}

export const defaultCategories = [
  { id: 'cat-push', name: 'Push', sort_order: 0, is_archived: false },
  { id: 'cat-pull', name: 'Pull', sort_order: 1, is_archived: false },
  { id: 'cat-legs', name: 'Legs', sort_order: 2, is_archived: false },
  { id: 'cat-core', name: 'Core / Accessory', sort_order: 3, is_archived: false },
]

export const defaultExercises = [
  ['ex-bench', 'cat-push', 'Barbell Bench Press'],
  ['ex-ohp', 'cat-push', 'Overhead Press'],
  ['ex-incline', 'cat-push', 'Incline DB Press'],
  ['ex-triceps', 'cat-push', 'Triceps Pushdown'],
  ['ex-lateral', 'cat-push', 'Lateral Raise'],
  ['ex-deadlift', 'cat-pull', 'Deadlift'],
  ['ex-row', 'cat-pull', 'Barbell Row'],
  ['ex-pulldown', 'cat-pull', 'Lat Pulldown'],
  ['ex-facepull', 'cat-pull', 'Face Pull'],
  ['ex-curl', 'cat-pull', 'Barbell Curl'],
  ['ex-squat', 'cat-legs', 'Back Squat'],
  ['ex-rdl', 'cat-legs', 'Romanian Deadlift'],
  ['ex-legpress', 'cat-legs', 'Leg Press'],
  ['ex-legcurl', 'cat-legs', 'Leg Curl'],
  ['ex-calf', 'cat-legs', 'Calf Raise'],
  ['ex-plank', 'cat-core', 'Plank', 'seconds', true],
  ['ex-legraise', 'cat-core', 'Hanging Leg Raise', 'reps', true],
  ['ex-crunch', 'cat-core', 'Cable Crunch'],
].map(([id, category_id, name, unit = 'kg', is_bodyweight = false]) => ({
  id,
  category_id,
  name,
  unit,
  is_bodyweight,
  is_archived: false,
}))

export function createDemoData() {
  const sessions = [
    { id: 'session-1', category_id: 'cat-push', started_at: isoDaysAgo(1), ended_at: isoDaysAgo(1, 19), notes: '' },
    { id: 'session-2', category_id: 'cat-legs', started_at: isoDaysAgo(3), ended_at: isoDaysAgo(3, 19), notes: '' },
    { id: 'session-3', category_id: 'cat-pull', started_at: isoDaysAgo(5), ended_at: isoDaysAgo(5, 19), notes: '' },
    { id: 'session-4', category_id: 'cat-push', started_at: isoDaysAgo(9), ended_at: isoDaysAgo(9, 19), notes: '' },
    { id: 'session-5', category_id: 'cat-legs', started_at: isoDaysAgo(14), ended_at: isoDaysAgo(14, 19), notes: '' },
  ]

  const rawSets = [
    ['set-1', 'session-1', 'ex-bench', 1, 8, 80], ['set-2', 'session-1', 'ex-bench', 2, 7, 82.5],
    ['set-3', 'session-1', 'ex-ohp', 1, 8, 45], ['set-4', 'session-1', 'ex-triceps', 1, 12, 30],
    ['set-5', 'session-2', 'ex-squat', 1, 5, 110], ['set-6', 'session-2', 'ex-squat', 2, 5, 115],
    ['set-7', 'session-2', 'ex-rdl', 1, 8, 85], ['set-8', 'session-3', 'ex-deadlift', 1, 5, 135],
    ['set-9', 'session-3', 'ex-row', 1, 8, 72.5], ['set-10', 'session-3', 'ex-curl', 1, 10, 27.5],
    ['set-11', 'session-4', 'ex-bench', 1, 8, 77.5], ['set-12', 'session-4', 'ex-ohp', 1, 8, 42.5],
    ['set-13', 'session-5', 'ex-squat', 1, 5, 105], ['set-14', 'session-5', 'ex-legpress', 1, 10, 160],
  ]
  const sets = rawSets.map(([id, session_id, exercise_id, set_number, reps, weight], index) => {
    const session = sessions.find((item) => item.id === session_id)
    return { id, session_id, exercise_id, set_number, reps, weight, is_pr: [1, 5, 7, 8].includes(index), created_at: session.started_at }
  })

  return {
    categories: defaultCategories,
    exercises: defaultExercises,
    sessions,
    sets,
    sessionExercises: [],
    preferences: { unit: 'kg', display_name: 'Athlete' },
  }
}
