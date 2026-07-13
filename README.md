# Velocity Performance

A mobile-first workout tracker built from the supplied Velocity Performance UI studies. It supports fixed weekly workout plans, target-aware live logging, friend connections, routine and progress sharing, personal records, analytics, Supabase authentication, and installable PWA behavior.

## Run locally

```powershell
npm install
Copy-Item .env.example .env.local
npm run dev
```

Without Supabase environment variables the app starts in persistent local demo mode, which is useful for reviewing every screen and interaction.

## Connect Supabase

1. Create a Supabase project.
2. Run [`supabase/schema.sql`](supabase/schema.sql) in the SQL editor.
3. Run each file in [`supabase/migrations`](supabase/migrations) in filename order.
4. Put the project URL and public anon key in `.env.local`:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

The schema enables row-level security for workout data. The planner/social migration adds profiles, friend requests, friends-only feed posts, shared routines, likes, and comments with their own row-level policies. Detailed sets remain private; progress is shared only as an opt-in summary.

## Publish with GitHub Pages

Set Pages to **GitHub Actions**. The included workflow detects the repository name and builds Vite with the matching Pages base path. The deployed browser connection uses the project URL and publishable key in `.env.production`; this key is intentionally public and protected by row-level security. Never place a Supabase service-role key in a frontend environment file.

The app uses hash-based routes so direct navigation works on GitHub Pages without server rewrites.
