# Velocity Performance Gym Tracker

A mobile-first, self-hostable workout tracker for individuals and small private training groups. Build fixed weekly routines, log sets in real time, track personal records, connect with friends, share progress summaries, and copy routines without running an application server.

The frontend is React + Vite and can be hosted as a static site. Each installation connects to its own Supabase project for authentication, PostgreSQL storage, and Row Level Security (RLS).

## What it includes

- Fixed weekly workout routines with scheduled training days.
- Per-exercise targets for sets, rep ranges, weight, rest, and notes.
- Live workout logging with personal-record detection.
- Mixed-category workouts and routines, including uncategorized exercises.
- Drag-and-drop exercise category boards with a touch-friendly select fallback.
- A fuzzy-searchable universal exercise catalog with near-duplicate suggestions.
- Exercise history, volume trends, and CSV export.
- Athlete profiles and username search.
- Athlete profile pages with recent posts and published workout/routine collections.
- Friend requests plus friends-only and public social posts.
- Opt-in workout summaries, likes, and comments.
- Friends-only or public routines that other athletes can copy into their planner.
- Installable PWA behavior and GitHub Pages deployment.
- A persistent local demo mode when Supabase is not configured.

## Architecture

```text
Browser / installed PWA
        |
        | Supabase publishable key + signed-in user's JWT
        v
Supabase Auth ---- PostgreSQL tables
                         |
                         +-- Row Level Security policies
```

There is no custom backend server and no elevated Supabase credential in the application. Every browser request runs as either the Supabase `anon` role or the signed-in user's `authenticated` role. This app grants no table access to `anon`; users must sign in before cloud data is loaded.

## Security model

| Data | Who can read it | Who can change it |
| --- | --- | --- |
| Categories, exercises, sessions, sets, records, preferences | Owner only | Owner only |
| Universal exercise catalog | Any authenticated member of the same Supabase project | Populated automatically from authenticated users' exercises |
| Athlete profile name, username, and bio | Any authenticated member of the same Supabase project | Profile owner |
| Friend requests | The two participants | Requester can send; recipient can accept; either can remove |
| Private routines | Owner only | Owner only |
| Friends routines | Owner and accepted friends | Owner only |
| Public routines | Any authenticated member of the same Supabase project | Owner only |
| Friends-only posts | Author and accepted friends | Author only |
| Public posts | Any authenticated member of the same Supabase project | Author only |
| Likes and comments | Anyone who can read the post | Signed-in author of the like/comment |

Detailed sets and workout history are never exposed to friends. A workout appears on the social board only when the athlete checks **Share a progress summary** at completion. That post contains totals and exercise names, not individual set rows.

### The truth about frontend API keys

Supabase publishable keys (`sb_publishable_...`) are designed for public clients. Even if the value is supplied to GitHub Actions as an encrypted secret, Vite must place it in the browser bundle, where a visitor can retrieve it with developer tools. It is an application identifier, not authorization to bypass RLS.

Never put any of these in this repository, a `VITE_*` variable, browser code, a screenshot, or an issue:

- a Supabase secret key (`sb_secret_...`);
- a legacy `service_role` JWT;
- a database password or connection string;
- a GitHub access token; or
- a user's access/refresh token.

Supabase documents publishable keys as safe for web pages and requires RLS to protect the data behind them. Secret/service-role keys bypass RLS and belong only in trusted server environments. See [Supabase API keys](https://supabase.com/docs/guides/getting-started/api-keys) and [Row Level Security](https://supabase.com/docs/guides/database/postgres/row-level-security).

## Prerequisites

- Node.js 22 or newer.
- npm (included with Node.js).
- A free or paid [Supabase](https://supabase.com/) account for cloud sync.
- A GitHub account if deploying with GitHub Pages.

## Quick start: local demo

```powershell
git clone https://github.com/YOUR-ACCOUNT/Gym-Track.git
Set-Location Gym-Track
npm install
npm run dev
```

Open the URL printed by Vite. Without environment variables, the app signs into a local demo athlete automatically and stores demo changes in browser `localStorage`. Demo mode does not contact Supabase and is useful for reviewing the UI.

## Create your own Supabase backend

Every fork should use a separate Supabase project. That gives the fork owner an isolated database and an independent friend network.

### 1. Create a project

Create a project in the [Supabase Dashboard](https://supabase.com/dashboard). Save the database password in a password manager; the frontend never needs it.

Wait until the project status is healthy before continuing.

### 2. Install the database schema

Open **SQL Editor** in the new Supabase project and run these files in order:

1. [`supabase/schema.sql`](supabase/schema.sql) — workout tables, RLS, PR triggers, and starter exercises.
2. [`supabase/migrations/20260714090000_add_planner_social.sql`](supabase/migrations/20260714090000_add_planner_social.sql) — profiles, friends, routines, posts, likes, and comments.
3. [`supabase/migrations/20260714093000_optimize_social_rls.sql`](supabase/migrations/20260714093000_optimize_social_rls.sql) — consolidated shared-read policies.
4. [`supabase/migrations/20260714100000_revoke_anonymous_access.sql`](supabase/migrations/20260714100000_revoke_anonymous_access.sql) — removes all signed-out table and schema access.
5. [`supabase/migrations/20260714110000_universal_exercises_public_routines.sql`](supabase/migrations/20260714110000_universal_exercises_public_routines.sql) — unassigned exercises, exercise types, the universal catalog, mixed workouts, and public routines.
6. [`supabase/migrations/20260714111000_index_exercise_catalog_creator.sql`](supabase/migrations/20260714111000_index_exercise_catalog_creator.sql) — covers the catalog creator foreign key.
7. [`supabase/verify-security.sql`](supabase/verify-security.sql) — read-only security checks and a policy inventory.

The verification script should complete without raising an exception. Its final query should return no execute grants for the trigger-only functions.

When future migration files are added, run only the files that have not already been applied, in filename order. Never edit an applied migration to change a live database; create a new migration instead.

### 3. Configure authentication

In **Authentication → Providers → Email**:

- Keep email/password authentication enabled.
- Enable email confirmation for real deployments.
- Set the minimum password length to at least 8 characters.
- Require stronger character combinations if appropriate for your group.
- Enable leaked-password protection when your Supabase plan supports it.
- Do not enable anonymous sign-ins for this app.

In **Authentication → URL Configuration** set:

- **Site URL:** `https://YOUR-GITHUB-USER.github.io/YOUR-REPOSITORY/`
- **Additional redirect URL:** `http://localhost:5173/**`

Use your real Pages URL and keep its trailing slash. Exact production redirect URLs are safer than broad wildcards. Supabase explains these settings in its [redirect URL guide](https://supabase.com/docs/guides/auth/redirect-urls).

#### Persistent login and cookies

Supabase Auth keeps the signed-in SPA session in persistent browser storage and refreshes its access token automatically. Closing and reopening the browser therefore keeps the user signed in until the session is revoked, expires under the project's Auth policy, or the user signs out.

The app also writes a `velocity_session_active=1` cookie for one year while a user is signed in. It is `SameSite=Strict`, marked `Secure` on HTTPS, scoped to the application's base path, and contains no token, email, user ID, or other personal data. Signing out removes it. It is only a non-sensitive session hint; Supabase's access and refresh tokens remain in persistent browser storage.

This split is intentional for a static GitHub Pages SPA. A true `HttpOnly` auth cookie must be created and refreshed by a trusted server, which this project does not have. Moving the refresh token into a JavaScript-readable cookie would expose it to script while also sending it with page requests. See Supabase's [session documentation](https://supabase.com/docs/guides/auth/sessions) and [JavaScript client initialization options](https://supabase.com/docs/reference/javascript/initializing).

### 4. Open signup and approve friendships

This project defaults to open account registration so friends can create their own accounts:

1. In **Authentication → Providers → Email**, enable **Allow new users to sign up**.
2. Keep **Confirm email** enabled so new members must verify ownership of their address.
3. Leave `VITE_ALLOW_SIGNUP=true`, or omit the GitHub repository variable because the deployment workflow defaults it to `true`.
4. After a friend registers, find them in **Discover Athletes**, send or accept their friend request, and only then will either account see content shared with **Friends** visibility.

Friend acceptance is manual, but account registration is not an administrator approval gate. Any person who can reach the site can register while signup is open, discover profiles in the same installation, and see posts or routines marked **Public** after signing in. Keep personal content set to **Private** or **Friends** until you have accepted the intended friendship.

The Vite variable only shows or hides the signup UI. Supabase Auth's **Allow new users to sign up** setting is the actual server-side registration control. To close registration later, disable that setting and set `VITE_ALLOW_SIGNUP=false`.

### 5. Get the public client configuration

Open the project's **Connect** dialog or **Settings → API Keys** and copy:

- the project URL; and
- the **Publishable key** (`sb_publishable_...`).

Do not copy the secret key or legacy service-role key.

### 6. Configure local development

Copy the example file:

```powershell
Copy-Item .env.example .env.local
```

Edit `.env.local`:

```env
VITE_SUPABASE_URL=https://YOUR-PROJECT-REF.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_YOUR_KEY
VITE_ALLOW_SIGNUP=true
```

`.env.local`, `.env.production`, and every other `.env*` file except `.env.example` are ignored by Git. Restart Vite after changing environment variables.

The app still accepts the legacy `VITE_SUPABASE_ANON_KEY` variable for older deployments, but new installations should use a publishable key and `VITE_SUPABASE_PUBLISHABLE_KEY`.

### 7. Run and test

```powershell
npm ci
npm run lint
npm run security:audit
npm run dev
```

Create two test accounts and verify:

1. Each account sees only its own workout history.
2. One account can send and the other can accept a friend request.
3. A private routine is invisible to the friend.
4. A shared routine becomes copyable only after friendship acceptance.
5. A public routine is visible and copyable without a friendship, but only after sign-in.
6. A shared workout appears as a summary, without individual sets.
7. A misspelled exercise search returns close matches, and exercise creation shows similar universal names.
8. An uncategorized exercise can be dragged into a category and selected alongside exercises from other categories.

## Deploy your fork to GitHub Pages

The included workflow builds with the repository name as Vite's base path, so forks work at `https://OWNER.github.io/REPOSITORY/` without editing `vite.config.js`.

### 1. Add repository secrets

In the fork, open **Settings → Secrets and variables → Actions → Secrets** and create:

| Secret | Value |
| --- | --- |
| `SUPABASE_URL` | `https://YOUR-PROJECT-REF.supabase.co` |
| `SUPABASE_PUBLISHABLE_KEY` | Your `sb_publishable_...` key |

The publishable key is not confidential at runtime, but storing configuration as an Actions secret keeps installation-specific values out of commits and masks them in workflow logs. GitHub documents this mechanism in [Using secrets in GitHub Actions](https://docs.github.com/en/actions/how-tos/write-workflows/choose-what-workflows-do/use-secrets).

### 2. Add the signup variable

Under **Actions → Variables**, create:

| Variable | Recommended value |
| --- | --- |
| `VITE_ALLOW_SIGNUP` | `true` for open account registration |

The workflow defaults this value to `true` when the variable is absent. Set it to `false` only when you also disable new signups in Supabase Auth.

### 3. Enable Pages

Open **Settings → Pages** and choose **GitHub Actions** as the source.

Push to `main` or manually run **Deploy to GitHub Pages** from the Actions tab. The workflow will:

1. install locked dependencies with `npm ci`;
2. fail clearly if the two Supabase secrets are missing;
3. run ESLint;
4. audit production dependencies for high-severity vulnerabilities;
5. build the Vite application;
6. verify the manifest and production assets; and
7. publish the `dist` artifact.

The app uses `HashRouter`, so client routes work on Pages without server rewrites.

The HTML includes a Content Security Policy limited to same-origin application assets, Google Fonts, and Supabase's standard `*.supabase.co` API/WebSocket endpoints. If a fork uses a custom Supabase domain, add that exact HTTPS/WSS host to `connect-src` in [`index.html`](index.html).

## Create and use your friend network

All accounts connected to the same Supabase project form one installation. Authenticated members can discover the other profiles in that installation and send friend requests.

- A fork using its own Supabase project has a completely separate network.
- Two deployments pointed at the same Supabase project share accounts and data policies.
- Do not point a public fork at somebody else's Supabase project.
- Friend requests require manual acceptance before friends-only content is shared.
- Open registration lets any signed-in account see content marked public.
- Removing a friendship immediately removes access to friends-only posts and shared routines.
- Public posts and public routines remain visible to all authenticated accounts in that installation.
- Deleting a user's Auth account cascades their owned application data.

## Environment variables

| Variable | Required | Exposure | Purpose |
| --- | --- | --- | --- |
| `VITE_SUPABASE_URL` | For cloud mode | Public | Supabase project API URL |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | For cloud mode | Public | Low-privilege browser client key |
| `VITE_SUPABASE_ANON_KEY` | Legacy only | Public | Backward-compatible legacy client key |
| `VITE_ALLOW_SIGNUP` | No | Public | Shows or hides the signup UI; not a security boundary |

Vite exposes every `VITE_*` variable to browser code. Never use that prefix for a credential that must remain secret.

## Available commands

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the local Vite server |
| `npm run lint` | Run ESLint |
| `npm run security:audit` | Check production dependencies for high-severity advisories |
| `npm run build` | Create a production bundle in `dist/` |
| `npm run preview` | Serve the production bundle locally |

## Project structure

```text
.github/
  workflows/deploy.yml     GitHub Pages pipeline
  dependabot.yml           npm and Actions update checks
public/                    PWA manifest, service worker, icon
src/
  components/              Shared UI components
  context/                 Authentication and Supabase-backed state
  data/                    Demo seed data
  lib/supabase.js          Public Supabase client initialization
  pages/                   Dashboard, planner, social, workouts, settings
supabase/
  schema.sql               Initial workout schema
  migrations/              Ordered planner/social changes
  verify-security.sql      Read-only RLS and grant verification
SECURITY.md                Private vulnerability reporting guidance
```

## Public-repository security checklist

Before publishing or accepting contributors:

- [ ] `git status` shows no `.env.local` or other credential file.
- [ ] No secret key, service-role key, database password, or token appears in any commit.
- [ ] GitHub secret scanning and push protection are enabled where available.
- [ ] Dependabot alerts and security updates are enabled.
- [ ] Branch protection requires the lint/build checks before merging.
- [ ] Supabase Security Advisor has no RLS findings.
- [ ] `supabase/verify-security.sql` passes.
- [ ] Email confirmation and an 8+ character password policy are enabled.
- [ ] Signup availability matches the intended network (`true` for open registration, `false` for a closed group).
- [ ] Sensitive posts and routines use **Private** or **Friends**, not **Public**.
- [ ] Production and local redirect URLs are exact and expected.

GitHub automatically scans public repositories for supported secret patterns, and repository push protection can block secrets before they enter history. See GitHub's [repository security quickstart](https://docs.github.com/en/code-security/getting-started/quickstart-for-securing-your-repository).

## Troubleshooting

### The app opens in demo mode

Both `VITE_SUPABASE_URL` and a publishable/legacy anon key must be present when Vite starts. Check `.env.local`, then restart `npm run dev`.

### GitHub Pages deployment says a Supabase secret is missing

Add `SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY` under repository **Actions secrets**. Local `.env.local` values are deliberately not uploaded to GitHub.

### Pages returns 404 for JavaScript or `manifest.webmanifest`

Use the included workflow and keep Pages configured for **GitHub Actions**. Do not upload the source tree as the Pages artifact. The workflow builds paths using the fork's repository name.

### Confirmation links return to the wrong site

Set Supabase Auth's Site URL to the exact deployed Pages URL, including the repository path and trailing slash. Add `http://localhost:5173/**` only as a development redirect.

### A new visitor cannot sign up

Check both controls: `VITE_ALLOW_SIGNUP` must not be `false`, and Supabase Auth's **Allow new users to sign up** setting must be enabled. After changing the GitHub variable, redeploy the Pages workflow because Vite embeds the value at build time.

### Login is not remembered

Confirm the browser allows site storage, the app is served from the same origin and repository path each time, and the user did not choose a private browsing mode that clears storage. The `velocity_session_active` cookie is only a hint; inspect the browser's local storage for the Supabase Auth entry and check the console for storage or token-refresh errors.

### A database request returns an RLS error

Confirm the user is signed in, all SQL files were run in order, and the row belongs to that user or is explicitly shared through an accepted friendship. Run `supabase/verify-security.sql` to inspect installed policies.

### A custom Supabase domain is blocked by Content Security Policy

Add the exact HTTPS and WSS custom hosts to the `connect-src` directive in `index.html`. Keep the standard policy narrow; do not replace it with unrestricted `*` sources.

## Security reports

Read [`SECURITY.md`](SECURITY.md). Do not post credentials or private user data in a public GitHub issue.

## License

Public source code is not automatically open source in the legal sense. This repository currently needs an explicit license file before others have clear permission to copy, modify, and redistribute it. The owner should choose an OSI-approved license such as MIT, Apache-2.0, or GPL-3.0 and add the corresponding `LICENSE` file.
