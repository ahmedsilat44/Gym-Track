# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Spotter is primarily for self-coached lifters and small groups of friends. They use it mainly through mobile browsers while planning training, working out in the gym, reviewing progress, and sharing selected activity with their community.

Administrators operate each community by reviewing new registrations, approving access, and monitoring privacy-safe usage signals for capacity planning.

## Product Purpose

Spotter combines workout planning, live set logging, exercise history, personal records, and a private social layer in one mobile-first web application. It should make structured training easy during a workout and let trusted groups share routines and progress without exposing detailed private workout data.

Success means athletes can plan and complete workouts with minimal friction, understand progress across sessions, reuse community knowledge, and remain in control of what they share.

## Positioning

Spotter is a private, self-hostable social workout tracker where each installation owns its Supabase project and therefore its accounts, data, approval policy, and friend network. Unlike a single public fitness network, communities can operate independently while still receiving the complete planning, tracking, and social product.

A possible future direction is an owner-operated server that can distribute isolated communities from one managed service. This is directional, not a current architectural commitment.

## Operating Context

- Athletes primarily use Spotter on a phone in a gym, often between sets and under time pressure.
- They create fixed weekly routines, choose or adjust exercises for a live session, enter sets, monitor rest time, and finish with an optional progress summary.
- They review exercise history, recent and all-time personal records, progress graphs, and workout frequency after training.
- Friends discover approved members, connect, publish selected posts or routines, preview shared routines, and copy useful routines into their own planner.
- Community administrators review a signup waitlist and inspect aggregate activity and capacity indicators.
- Developers can run a persistent local demo or connect a fork to an independent Supabase project.

## Capabilities and Constraints

- Mobile-browser-first React and Vite web application with installable PWA behavior.
- Static deployment, currently designed for GitHub Pages, with no custom application server.
- Supabase provides email authentication, PostgreSQL storage, RPCs, and Row Level Security.
- Registration is open, but application usage requires administrator approval.
- Each current deployment connects to one Supabase project and forms one isolated community network.
- Workout plans support scheduled routines, mixed exercise categories, targets, reordering, and per-session add/remove flexibility.
- Exercise discovery uses fuzzy search and near-duplicate suggestions against a shared catalog; exercises may initially be uncategorized.
- Detailed raw sets are retained for three months. Compact per-session exercise records and personal records remain permanent for progress tracking.
- Social visibility supports private, friends-only, and community-public content. Detailed set rows are never shared through workout-summary posts.
- Browser code may contain only Supabase publishable configuration. Secret keys, service-role credentials, database passwords, and user tokens must never enter the repository or client bundle.
- Demo mode remains available without Supabase and persists locally in the browser.
- A future multi-community managed backend remains an open architectural decision.

## Brand Commitments

- Product name: Spotter.
- The product voice is direct, focused, concise, encouraging, and useful during physical activity.
- Spotter is open source and designed to be straightforward for others to deploy with their own backend and community.

## Evidence on Hand

- The working React application and its routes are under `src/`.
- Supabase schema, ordered migrations, and security verification are under `supabase/`.
- PWA assets are under `public/`.
- Deployment and contributor setup are documented in `README.md`.
- Security reporting guidance exists in `SECURITY.md`.
- The incumbent visual system is documented separately in `DESIGN.md`.
- No testimonials, customer logos, commercial benchmarks, or third-party endorsements are established; future interfaces must not fabricate them.
- The repository does not currently include an explicit open-source license, so redistribution terms remain an open owner decision.

## Product Principles

1. Optimize the workout flow for one-handed, glanceable mobile use under gym conditions.
2. Preserve athlete control: private by default, explicit sharing, and no exposure of detailed set history to friends.
3. Make progression legible through durable per-session records, useful personal records, and clear comparisons over time.
4. Keep community ownership real through isolated deployments, strong Row Level Security, and administrator-controlled membership.
5. Reduce repeated work through reusable routines, a universal exercise catalog, and fast fuzzy discovery.
