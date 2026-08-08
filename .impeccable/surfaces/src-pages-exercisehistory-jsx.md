---
version: 1
slug: "src-pages-exercisehistory-jsx"
primary_target: "src/pages/ExerciseHistory.jsx"
related_targets: ["src/pages/Progress.jsx"]
---

# Exercise progression

- Scope: exercise detail and the supporting aggregate Progress trend; visitor mode is Operate.
- Audience/job: a lifter reviewing performance on a phone between or after workouts; compare session results, identify durable PRs, and inspect recent working sets.
- Primary task: switch among heaviest weight, estimated 1RM, best set volume, best session volume, and most reps, then understand movement over time.
- Evidence: permanent per-session weight and estimated-1RM records; raw-set-derived volume and repetition metrics for the retained three-month window.
- Constraints: never imply raw-set metrics are permanent; bodyweight duration uses seconds; graphs need real dates, readable scales, accessible summaries, empty states, and mobile-safe controls.
- Direction: one dominant instrumentation line chart followed by a compact metric rail and a ledger-like PR summary in Spotter's established midnight/teal system.
- Memorable moment: the chart redraws immediately when the athlete switches what “progress” means.
- Aggregate relation: Progress replaces monthly bars with a 12-week weekly-volume line using the same chart grammar.
