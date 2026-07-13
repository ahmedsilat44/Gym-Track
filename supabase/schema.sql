-- Velocity Performance / Gym Tracker
-- Run this entire file in the Supabase SQL editor for a new project.

create extension if not exists pgcrypto;

create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(trim(name)) between 1 and 80),
  sort_order integer not null default 0,
  is_archived boolean not null default false,
  created_at timestamptz not null default now(),
  unique (user_id, name)
);

create table if not exists public.exercises (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  category_id uuid not null references public.categories(id),
  name text not null check (char_length(trim(name)) between 1 and 120),
  unit text not null default 'kg' check (unit in ('kg', 'lb', 'reps', 'seconds')),
  is_bodyweight boolean not null default false,
  is_archived boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  category_id uuid not null references public.categories(id),
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  notes text check (char_length(notes) <= 2000)
);

create table if not exists public.session_exercises (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  session_id uuid not null references public.sessions(id) on delete cascade,
  exercise_id uuid not null references public.exercises(id),
  sort_order integer not null default 0,
  unique (session_id, exercise_id)
);

create table if not exists public.sets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  session_id uuid not null references public.sessions(id) on delete cascade,
  exercise_id uuid not null references public.exercises(id),
  set_number integer not null check (set_number > 0),
  reps integer not null check (reps > 0),
  weight numeric(10,2) not null check (weight >= 0),
  is_pr boolean not null default false,
  created_at timestamptz not null default now(),
  unique (session_id, exercise_id, set_number)
);

create table if not exists public.personal_records (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  exercise_id uuid not null references public.exercises(id),
  best_weight numeric(10,2),
  best_reps_at_weight integer,
  best_est_1rm numeric(12,3),
  achieved_at timestamptz,
  set_id uuid references public.sets(id) on delete set null,
  unique (user_id, exercise_id)
);

create table if not exists public.user_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text check (char_length(display_name) <= 80),
  unit text not null default 'kg' check (unit in ('kg', 'lb')),
  updated_at timestamptz not null default now()
);

create index if not exists exercises_user_category_idx on public.exercises(user_id, category_id) where not is_archived;
create index if not exists sessions_user_started_idx on public.sessions(user_id, started_at desc);
create index if not exists sets_user_exercise_created_idx on public.sets(user_id, exercise_id, created_at desc);
create index if not exists sets_session_idx on public.sets(session_id, exercise_id, set_number);

alter table public.categories enable row level security;
alter table public.exercises enable row level security;
alter table public.sessions enable row level security;
alter table public.session_exercises enable row level security;
alter table public.sets enable row level security;
alter table public.personal_records enable row level security;
alter table public.user_preferences enable row level security;

do $$
declare table_name text;
begin
  foreach table_name in array array['categories', 'exercises', 'sessions', 'session_exercises', 'sets', 'personal_records', 'user_preferences']
  loop
    execute format('drop policy if exists "Users manage their own rows" on public.%I', table_name);
    execute format(
      'create policy "Users manage their own rows" on public.%I for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid())',
      table_name
    );
  end loop;
end $$;

-- Mark every record-breaking set at the moment it is logged, then update the
-- current cached record. Historical PR badges stay intact.
create or replace function public.record_inserted_set()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  current_record public.personal_records%rowtype;
  new_est numeric := new.weight * (1 + new.reps::numeric / 30);
  is_new_record boolean := false;
begin
  select * into current_record
  from public.personal_records
  where user_id = new.user_id and exercise_id = new.exercise_id
  for update;

  is_new_record := not found
    or new_est > coalesce(current_record.best_est_1rm, 0)
    or new.weight > coalesce(current_record.best_weight, 0);

  if is_new_record then
    update public.sets set is_pr = true where id = new.id;
  end if;

  insert into public.personal_records (
    user_id, exercise_id, best_weight, best_reps_at_weight,
    best_est_1rm, achieved_at, set_id
  ) values (
    new.user_id, new.exercise_id, new.weight, new.reps,
    new_est, new.created_at, new.id
  )
  on conflict (user_id, exercise_id) do update set
    best_weight = greatest(public.personal_records.best_weight, excluded.best_weight),
    best_reps_at_weight = case
      when excluded.best_weight > public.personal_records.best_weight then excluded.best_reps_at_weight
      when excluded.best_weight = public.personal_records.best_weight then greatest(public.personal_records.best_reps_at_weight, excluded.best_reps_at_weight)
      else public.personal_records.best_reps_at_weight
    end,
    best_est_1rm = greatest(public.personal_records.best_est_1rm, excluded.best_est_1rm),
    achieved_at = case when excluded.best_est_1rm > public.personal_records.best_est_1rm then excluded.achieved_at else public.personal_records.achieved_at end,
    set_id = case when excluded.best_est_1rm > public.personal_records.best_est_1rm then excluded.set_id else public.personal_records.set_id end;

  return new;
end;
$$;

-- If a set is removed, rebuild only the current cache. Past is_pr flags still
-- describe whether those sets were records when originally achieved.
create or replace function public.record_deleted_set()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  best_est public.sets%rowtype;
  heaviest public.sets%rowtype;
begin
  select * into best_est from public.sets
  where user_id = old.user_id and exercise_id = old.exercise_id
  order by (weight * (1 + reps::numeric / 30)) desc, weight desc, created_at asc limit 1;

  if not found then
    delete from public.personal_records where user_id = old.user_id and exercise_id = old.exercise_id;
    return old;
  end if;

  select * into heaviest from public.sets
  where user_id = old.user_id and exercise_id = old.exercise_id
  order by weight desc, reps desc, created_at asc limit 1;

  insert into public.personal_records (user_id, exercise_id, best_weight, best_reps_at_weight, best_est_1rm, achieved_at, set_id)
  values (old.user_id, old.exercise_id, heaviest.weight, heaviest.reps, best_est.weight * (1 + best_est.reps::numeric / 30), best_est.created_at, best_est.id)
  on conflict (user_id, exercise_id) do update set
    best_weight = excluded.best_weight,
    best_reps_at_weight = excluded.best_reps_at_weight,
    best_est_1rm = excluded.best_est_1rm,
    achieved_at = excluded.achieved_at,
    set_id = excluded.set_id;

  return old;
end;
$$;

drop trigger if exists sets_record_insert on public.sets;
drop trigger if exists sets_record_delete on public.sets;
create trigger sets_record_insert after insert on public.sets
for each row execute function public.record_inserted_set();
create trigger sets_record_delete after delete on public.sets
for each row execute function public.record_deleted_set();

-- Seed the editable starter library for each new account.
create or replace function public.seed_new_athlete()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  push_id uuid := gen_random_uuid();
  pull_id uuid := gen_random_uuid();
  legs_id uuid := gen_random_uuid();
  core_id uuid := gen_random_uuid();
begin
  insert into public.user_preferences (user_id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'display_name', split_part(new.email, '@', 1)));

  insert into public.categories (id, user_id, name, sort_order) values
    (push_id, new.id, 'Push', 0),
    (pull_id, new.id, 'Pull', 1),
    (legs_id, new.id, 'Legs', 2),
    (core_id, new.id, 'Core / Accessory', 3);

  insert into public.exercises (user_id, category_id, name, unit, is_bodyweight) values
    (new.id, push_id, 'Barbell Bench Press', 'kg', false),
    (new.id, push_id, 'Overhead Press', 'kg', false),
    (new.id, push_id, 'Incline DB Press', 'kg', false),
    (new.id, push_id, 'Triceps Pushdown', 'kg', false),
    (new.id, push_id, 'Lateral Raise', 'kg', false),
    (new.id, pull_id, 'Deadlift', 'kg', false),
    (new.id, pull_id, 'Barbell Row', 'kg', false),
    (new.id, pull_id, 'Lat Pulldown', 'kg', false),
    (new.id, pull_id, 'Face Pull', 'kg', false),
    (new.id, pull_id, 'Barbell Curl', 'kg', false),
    (new.id, legs_id, 'Back Squat', 'kg', false),
    (new.id, legs_id, 'Romanian Deadlift', 'kg', false),
    (new.id, legs_id, 'Leg Press', 'kg', false),
    (new.id, legs_id, 'Leg Curl', 'kg', false),
    (new.id, legs_id, 'Calf Raise', 'kg', false),
    (new.id, core_id, 'Plank', 'seconds', true),
    (new.id, core_id, 'Hanging Leg Raise', 'reps', true),
    (new.id, core_id, 'Cable Crunch', 'kg', false);
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.seed_new_athlete();

grant usage on schema public to authenticated;
grant select, insert, update, delete on all tables in schema public to authenticated;
