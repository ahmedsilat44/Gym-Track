-- Run after schema.sql and every migration. This script makes no changes.
-- It raises an error if a public table lacks RLS or if anon has table access.

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
