-- Run after schema.sql and every migration. This script makes no changes.
-- It raises an error for missing RLS, unsafe grants, or broken ownership links.

do $$
declare
  unsafe_tables text;
begin
  select string_agg(quote_ident(tablename), ', ' order by tablename)
  into unsafe_tables
  from pg_tables
  where schemaname = 'public' and not rowsecurity;

  if unsafe_tables is not null then
    raise exception 'Public tables without RLS: %', unsafe_tables;
  end if;

  if exists (
    select 1
    from information_schema.role_table_grants
    where table_schema = 'public' and grantee = 'anon'
  ) then
    raise exception 'The anon role has table privileges. This app is authenticated-only.';
  end if;

  if has_table_privilege('authenticated', 'public.personal_records', 'INSERT')
    or has_table_privilege('authenticated', 'public.personal_records', 'UPDATE')
    or has_table_privilege('authenticated', 'public.personal_records', 'DELETE') then
    raise exception 'Authenticated clients can modify trigger-derived personal records.';
  end if;

  if has_table_privilege('authenticated', 'public.sets', 'UPDATE')
    or has_table_privilege('authenticated', 'public.session_exercises', 'UPDATE') then
    raise exception 'Authenticated clients have unnecessary update grants on immutable workout rows.';
  end if;

  if exists (
    select 1 from public.session_exercises child
    join public.sessions parent on parent.id = child.session_id
    where child.user_id <> parent.user_id
  ) or exists (
    select 1 from public.session_exercises child
    join public.exercises parent on parent.id = child.exercise_id
    where child.user_id <> parent.user_id
  ) or exists (
    select 1 from public.sets child
    join public.sessions parent on parent.id = child.session_id
    where child.user_id <> parent.user_id
  ) or exists (
    select 1 from public.sets child
    join public.exercises parent on parent.id = child.exercise_id
    where child.user_id <> parent.user_id
  ) or exists (
    select 1 from public.sets child
    where not exists (
      select 1 from public.session_exercises selected
      where selected.session_id = child.session_id and selected.exercise_id = child.exercise_id
    )
  ) or exists (
    select 1 from public.routine_days child
    join public.routines parent on parent.id = child.routine_id
    where child.user_id <> parent.user_id
  ) or exists (
    select 1 from public.routine_exercises child
    join public.routine_days parent on parent.id = child.routine_day_id
    where child.user_id <> parent.user_id
  ) then
    raise exception 'Cross-owner or orphaned model links were found.';
  end if;
end;
$$;

select
  schemaname,
  tablename,
  rowsecurity as rls_enabled
from pg_tables
where schemaname = 'public'
order by tablename;

select
  tablename,
  policyname,
  roles,
  cmd
from pg_policies
where schemaname = 'public'
order by tablename, cmd, policyname;

select
  routine_name,
  grantee,
  privilege_type
from information_schema.routine_privileges
where routine_schema = 'public'
  and grantee in ('PUBLIC', 'anon', 'authenticated')
  and routine_name in (
    'record_inserted_set',
    'record_deleted_set',
    'seed_new_athlete',
    'seed_social_profile',
    'validate_friendship_acceptance',
    'normalize_exercise_name',
    'sync_exercise_to_catalog'
  )
order by routine_name, grantee;
