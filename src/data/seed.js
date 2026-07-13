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
  exercise_type: 'strength',
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

  const routineDays = [
    { id: 'routine-day-push', user_id: 'demo-user', routine_id: 'routine-demo', name: 'Push strength', weekday: 1, sort_order: 0 },
    { id: 'routine-day-pull', user_id: 'demo-user', routine_id: 'routine-demo', name: 'Pull strength', weekday: 3, sort_order: 1 },
    { id: 'routine-day-legs', user_id: 'demo-user', routine_id: 'routine-demo', name: 'Leg day', weekday: 5, sort_order: 2 },
  ]
  const routineExercises = [
    ['plan-bench', 'routine-day-push', 'ex-bench', 'Barbell Bench Press', 4, 6, 8, 80],
    ['plan-ohp', 'routine-day-push', 'ex-ohp', 'Overhead Press', 3, 8, 10, 45],
    ['plan-row', 'routine-day-pull', 'ex-row', 'Barbell Row', 4, 6, 8, 70],
    ['plan-pulldown', 'routine-day-pull', 'ex-pulldown', 'Lat Pulldown', 3, 10, 12, 55],
    ['plan-squat', 'routine-day-legs', 'ex-squat', 'Back Squat', 4, 5, 6, 110],
    ['plan-rdl', 'routine-day-legs', 'ex-rdl', 'Romanian Deadlift', 3, 8, 10, 85],
  ].map(([id, routine_day_id, exercise_id, exercise_name, target_sets, target_reps_min, target_reps_max, target_weight], sort_order) => ({
    id, user_id: 'demo-user', routine_day_id, exercise_id, exercise_name, unit: 'kg',
    target_sets, target_reps_min, target_reps_max, target_weight, rest_seconds: 90, notes: '', sort_order,
  }))

  return {
    categories: defaultCategories,
    exercises: defaultExercises,
    exerciseCatalog: defaultExercises.map(({ id, name, exercise_type, unit, is_bodyweight }) => ({
      id: `catalog-${id}`,
      normalized_name: name.toLowerCase().replace(/\s+/g, ' '),
      name,
      exercise_type,
      unit,
      is_bodyweight,
      created_by: 'demo-user',
    })),
    sessions,
    sets,
    sessionExercises: [],
    preferences: { unit: 'kg', display_name: 'Athlete' },
    profiles: [
      { id: 'demo-user', username: 'athlete', display_name: 'Athlete', bio: 'Building strength one session at a time.' },
      { id: 'demo-friend', username: 'sara_lifts', display_name: 'Sara', bio: 'Powerlifting and good playlists.' },
    ],
    friendships: [{ id: 'demo-friendship', requester_id: 'demo-friend', addressee_id: 'demo-user', status: 'accepted', created_at: isoDaysAgo(30), accepted_at: isoDaysAgo(29) }],
    routines: [{ id: 'routine-demo', user_id: 'demo-user', name: '3-Day Strength', description: 'A fixed Monday, Wednesday, Friday strength plan.', is_shared: false, visibility: 'private', updated_at: new Date().toISOString() }],
    routineDays,
    routineExercises,
    feedPosts: [{ id: 'demo-post', user_id: 'demo-friend', post_type: 'workout', caption: 'Deadlifts felt strong today!', visibility: 'friends', routine_id: null, metadata: { category_name: 'Pull', set_count: 12, exercise_count: 4, exercise_names: ['Deadlift', 'Barbell Row', 'Lat Pulldown'], total_volume: 4820, pr_count: 1 }, created_at: isoDaysAgo(1, 20) }],
    postLikes: [],
    postComments: [],
  }
}
