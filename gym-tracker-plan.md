# Gym Tracker — Build Plan

## 1. Concept Summary

A single-page, mobile-first web app (installable as a home-screen PWA on iPhone) for logging workouts in real time, with Supabase as the only backend. No servers to manage — static frontend + Supabase Postgres/Auth, hosted on GitHub Pages.

Core loop: **pick workout day → pick exercise → tap steppers to log each set → auto-detects PRs → dashboard shows progress.**

---

## 2. Exercise Category Structure (Fully Editable)

Categories are **not hardcoded** — they're just another table you manage from the Settings screen, same as exercises. Nothing is fixed in code; the four categories below are only *seed data* loaded the first time you set up the app, so you have a sensible starting point instead of an empty app.

**Default seed categories** (editable/removable at any time):

| Category | Example Exercises |
|---|---|
| **Push** | Bench Press, Overhead Press, Incline DB Press, Triceps Pushdown, Lateral Raise |
| **Pull** | Deadlift, Barbell Row, Lat Pulldown, Face Pull, Barbell Curl |
| **Legs** | Squat, Romanian Deadlift, Leg Press, Leg Curl, Calf Raise |
| **Core/Accessory** | Plank, Hanging Leg Raise, Cable Crunch |

From the **Settings → Manage Categories** screen you can:
- **Rename** a category (e.g. "Legs" → "Lower Body")
- **Add** a new category (e.g. "Cardio", "Mobility", "Arms")
- **Delete** a category — exercises under it are prompted to be reassigned or archived, never silently orphaned
- **Reorder** categories (controls display order on the category picker)

From **Settings → Manage Exercises** you can:
- **Add** a new exercise under any category
- **Edit** an exercise's name, category, unit, or bodyweight flag
- **Remove** (archive, not hard-delete) an exercise — past logged sets stay intact for history/PRs even if the exercise is later removed from active use

This still naturally supports a **PPL (Push/Pull/Legs) rotation** if you keep the defaults, but the structure itself imposes nothing — categories are just user-owned rows, so the app adapts to however you want to split your training.

---

## 3. Data Model (Supabase / Postgres)

```sql
-- Categories (fully user-editable — this replaces any hardcoded list)
create table categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  name text not null,
  sort_order int not null default 0,
  is_archived boolean default false,
  created_at timestamptz default now(),
  unique (user_id, name)
);

-- Exercises (your library)
create table exercises (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  category_id uuid references categories not null,
  name text not null,
  unit text not null default 'kg',
  is_bodyweight boolean default false,
  is_archived boolean default false,
  created_at timestamptz default now()
);

-- Workout sessions (one per gym visit)
create table sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  category_id uuid references categories not null,
  started_at timestamptz default now(),
  ended_at timestamptz,
  notes text
);

-- Individual sets logged
create table sets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  session_id uuid references sessions not null,
  exercise_id uuid references exercises not null,
  set_number int not null,
  reps int not null,
  weight numeric not null,
  is_pr boolean default false,
  created_at timestamptz default now()
);

-- Cached PRs (denormalized for fast dashboard reads)
create table personal_records (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  exercise_id uuid references exercises not null unique,
  best_weight numeric,
  best_reps_at_weight int,
  best_est_1rm numeric,
  achieved_at timestamptz,
  set_id uuid references sets
);
```

### Row Level Security (RLS)

Every table — including `categories` — gets a policy `user_id = auth.uid()` for select/insert/update/delete. Since this is single-user, it's mostly a safety net — but it's free and correct to set up with Supabase Auth, and it's essential since the app will be public on GitHub Pages.

### Archiving vs. Deleting

`categories` and `exercises` use **soft delete** (`is_archived`) rather than hard delete:
- "Removing" a category or exercise from Settings just sets `is_archived = true` and hides it from pickers
- Historical `sessions` and `sets` keep referencing the archived row, so past charts/PRs never break
- If a category is archived while exercises still reference it, the UI prompts you to reassign those exercises to another category first (or archive them too) — this keeps the data model consistent without needing cascading deletes

### PR Detection Logic

After each set insert, compare against `personal_records` using estimated 1RM (Epley formula: `weight * (1 + reps/30)`). Recommended as a **Postgres trigger** (server-side) rather than client-side JS, so PRs stay correct regardless of which device/session logs the set.

---

## 4. App Structure (Screens)

1. **Login** — Supabase email/password (one-time; session persists via localStorage).
2. **Dashboard (home)**
   - This week's session count, streak
   - PR highlights (recent PRs, card style)
   - "Start Workout" button → category picker
   - Charts: volume over time, per-category frequency
3. **Start Workout**
   - Pick category (Push/Pull/Legs/Core)
   - Pick exercise(s) for today (multi-select from library, reorderable)
4. **Active Session** (core screen — used mid-set, big touch targets)
   - Current exercise name, large
   - Stepper for **weight** (±2.5 / ±5) and **reps** (±1)
   - Big "Log Set" button
   - List of sets already logged this exercise, with PR badge if hit
   - Swipe/tap to next exercise
   - "Finish Workout" button
5. **Exercise Detail / History**
   - Line chart of best weight over time
   - Full set history table
   - Current PR pinned at top
6. **Settings**
   - **Manage Categories** — add, rename, reorder, archive
   - **Manage Exercises** — add, edit, reassign category, archive
   - Units (kg/lb)
   - Export data (CSV)

---

## 5. Tech Stack

- **Frontend:** React + Vite (compiles to static files for GitHub Pages, component reuse for stepper/set-row/chart, good chart libraries like Recharts). Alternative: plain HTML/JS/Alpine.js for zero build step.
- **Backend:** None — Supabase client SDK (`@supabase/supabase-js`) called directly from the frontend.
- **Auth:** Supabase Auth (email/password).
- **Hosting:** GitHub Pages (static build output).
- **PWA:** `manifest.json` + service worker so it installs to the iPhone home screen and opens full-screen like a native app. Offline sync deferred/optional.

---

## 6. Project Structure

```
gym-tracker/
├── index.html
├── src/
│   ├── main.jsx
│   ├── supabaseClient.js
│   ├── App.jsx
│   ├── pages/
│   │   ├── Login.jsx
│   │   ├── Dashboard.jsx
│   │   ├── StartWorkout.jsx
│   │   ├── ActiveSession.jsx
│   │   ├── ExerciseHistory.jsx
│   │   └── Settings.jsx
│   ├── components/
│   │   ├── Stepper.jsx
│   │   ├── SetRow.jsx
│   │   ├── PRBadge.jsx
│   │   ├── ExercisePicker.jsx
│   │   ├── CategoryManager.jsx
│   │   └── ExerciseManager.jsx
│   └── hooks/
│       └── useSets.js
├── public/
│   ├── manifest.json
│   └── icons/
├── supabase/
│   └── schema.sql
├── vite.config.js
└── package.json
```

---

## 7. Key Implementation Details

- **`vite.config.js` base path:** GitHub Pages serves from `/repo-name/`, so `base: '/gym-tracker/'` must be set or assets will 404.
- **Supabase keys in a public repo:** the anon key is safe to expose (RLS protects data) — RLS policies must be verified as airtight before publishing.
- **Mobile ergonomics:** min 44px tap targets (Apple HIG), sticky "Log Set" button, `viewport-fit=cover` + safe-area insets for notch/home-indicator, prevent accidental pull-to-refresh mid-set.
- **1RM PR logic:** track both heaviest weight ever *and* best estimated 1RM, since a heavy single vs. a strong rep-set are different achievements.

---

## 8. Build Phases

1. **Phase 1 — Foundation:** Supabase project + schema + RLS, Vite React scaffold, deploy empty shell to GitHub Pages (get the pipeline working first).
2. **Phase 2 — Core Logging:** exercise library, start session, active session screen with steppers, save sets.
3. **Phase 3 — PR Logic:** Postgres trigger or client-side calc, PR badges, PR history table.
4. **Phase 4 — Dashboard:** charts, streaks, summaries.
5. **Phase 5 — Polish:** PWA install, offline resilience for flaky gym wifi, CSV export.
6. **Phase 6 — Publish:** GitHub Actions to auto-build + deploy to Pages on push.

---

## 9. Publishing Checklist

- [ ] Create Supabase project, run schema, set RLS policies
- [ ] GitHub repo setup + Pages settings (source: GitHub Actions)
- [ ] `deploy.yml` GitHub Action to build the Vite app and push to Pages on every push to `main`
- [ ] Add app to iPhone home screen as a PWA
