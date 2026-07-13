-- Universal exercise discovery, flexible categories, and public routines.

alter table public.exercises alter column category_id drop not null;
alter table public.sessions alter column category_id drop not null;

alter table public.exercises
  add column if not exists exercise_type text not null default 'strength';

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'exercises_exercise_type_check'
      and conrelid = 'public.exercises'::regclass
  ) then
    alter table public.exercises
      add constraint exercises_exercise_type_check
      check (exercise_type in ('strength', 'cardio', 'mobility', 'conditioning', 'other'));
  end if;
end $$;

create table if not exists public.exercise_catalog (
  id uuid primary key default gen_random_uuid(),
  normalized_name text not null unique,
  name text not null check (char_length(trim(name)) between 1 and 120),
  exercise_type text not null default 'strength'
    check (exercise_type in ('strength', 'cardio', 'mobility', 'conditioning', 'other')),
  unit text not null default 'kg' check (unit in ('kg', 'lb', 'reps', 'seconds')),
  is_bodyweight boolean not null default false,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists exercise_catalog_type_name_idx
  on public.exercise_catalog(exercise_type, name);

create or replace function public.normalize_exercise_name(input_name text)
returns text
language sql
immutable
set search_path = public
as $$
  select lower(regexp_replace(trim(input_name), '\s+', ' ', 'g'));
$$;

create or replace function public.sync_exercise_to_catalog()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.exercise_catalog (
    normalized_name,
    name,
    exercise_type,
    unit,
    is_bodyweight,
    created_by
  ) values (
    public.normalize_exercise_name(new.name),
    trim(new.name),
    new.exercise_type,
    new.unit,
    new.is_bodyweight,
    new.user_id
  )
  on conflict (normalized_name) do nothing;

  return new;
end;
$$;

drop trigger if exists exercises_sync_universal_catalog on public.exercises;
create trigger exercises_sync_universal_catalog
after insert or update of name, exercise_type, unit, is_bodyweight on public.exercises
for each row execute function public.sync_exercise_to_catalog();

insert into public.exercise_catalog (
  normalized_name,
  name,
  exercise_type,
  unit,
  is_bodyweight,
  created_by
)
select distinct on (public.normalize_exercise_name(exercise.name))
  public.normalize_exercise_name(exercise.name),
  trim(exercise.name),
  exercise.exercise_type,
  exercise.unit,
  exercise.is_bodyweight,
  exercise.user_id
from public.exercises exercise
where trim(exercise.name) <> ''
order by public.normalize_exercise_name(exercise.name), exercise.created_at
on conflict (normalized_name) do nothing;

alter table public.exercise_catalog enable row level security;

drop policy if exists "Authenticated users view universal exercises" on public.exercise_catalog;
create policy "Authenticated users view universal exercises" on public.exercise_catalog
for select to authenticated using (true);

grant select on public.exercise_catalog to authenticated;
revoke all privileges on public.exercise_catalog from anon;
revoke execute on function public.normalize_exercise_name(text) from public, anon, authenticated;
revoke execute on function public.sync_exercise_to_catalog() from public, anon, authenticated;

alter table public.routines
  add column if not exists visibility text not null default 'private';

update public.routines
set visibility = case when is_shared then 'friends' else 'private' end
where visibility = 'private';

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'routines_visibility_check'
      and conrelid = 'public.routines'::regclass
  ) then
    alter table public.routines
      add constraint routines_visibility_check
      check (visibility in ('private', 'friends', 'public'));
  end if;
end $$;

drop policy if exists "Users view available routines" on public.routines;
create policy "Users view available routines" on public.routines
for select to authenticated using (
  user_id = (select auth.uid())
  or visibility = 'public'
  or (visibility = 'friends' and exists (
    select 1 from public.friendships friendship
    where friendship.status = 'accepted'
      and ((friendship.requester_id = (select auth.uid()) and friendship.addressee_id = routines.user_id)
        or (friendship.addressee_id = (select auth.uid()) and friendship.requester_id = routines.user_id))
  ))
);
