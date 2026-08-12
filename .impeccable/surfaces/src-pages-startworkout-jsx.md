---
version: 1
slug: "src-pages-startworkout-jsx"
primary_target: "src/pages/StartWorkout.jsx"
related_targets: ["src/pages/ExerciseLibrary.jsx","src/pages/CategoryManager.jsx","src/pages/Settings.jsx"]
---

# Workout library flow

- Scope: workout builder, exercise library, category manager, and Settings entry point.
- Visitor mode: Operate.
- Audience: athletes building a session on mobile or managing their training library.
- Job: create a movement without breaking workout setup, select it immediately, and organize it later without cluttering Settings.
- Primary action: create an exercise in the workout builder, which becomes selected for that session.
- Content proof: real personal exercise and category data, including intentionally unassigned exercises.
- Constraints: mobile-browser-first; categories optional; fuzzy duplicate prompts remain before saving; drag-and-drop has a select control fallback; every action is reachable with touch controls.
- Direction: focused instrument-panel pages in Spotter's midnight system; Settings is a calm launchpad, the builder stays task-first, and management moves to dedicated boards.
- Memorable moment: a new exercise made mid-plan enters the selected workout immediately, with no detour through Settings.
- Unresolved: none.
