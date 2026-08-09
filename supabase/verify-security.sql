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

  if to_regclass('public.app_usage_daily') is null then
    raise exception 'Admin usage analytics migration has not been applied.';
  end if;

  if has_table_privilege('authenticated', 'public.app_usage_daily', 'SELECT')
    or has_table_privilege('authenticated', 'public.app_usage_daily', 'INSERT')
    or has_table_privilege('authenticated', 'public.app_usage_daily', 'UPDATE')
    or has_table_privilege('authenticated', 'public.app_usage_daily', 'DELETE') then
    raise exception 'Authenticated clients can access raw usage counters directly.';
  end if;

  if to_regclass('public.exercise_session_records') is null then
    raise exception 'Three-month set-retention migration has not been applied.';
  end if;

  if has_table_privilege('authenticated', 'public.exercise_session_records', 'INSERT')
    or has_table_privilege('authenticated', 'public.exercise_session_records', 'UPDATE')
    or has_table_privilege('authenticated', 'public.exercise_session_records', 'DELETE') then
    raise exception 'Authenticated clients can directly change permanent session records.';
  end if;

  if to_regclass('public.feature_requests') is null then
    raise exception 'Public feature-board migration has not been applied.';
  end if;

  if has_table_privilege('anon', 'public.feature_requests', 'SELECT')
    or has_table_privilege('anon', 'public.feature_requests', 'INSERT')
    or has_table_privilege('authenticated', 'public.feature_requests', 'SELECT')
    or has_table_privilege('authenticated', 'public.feature_requests', 'INSERT')
    or has_table_privilege('authenticated', 'public.feature_requests', 'UPDATE')
    or has_table_privilege('authenticated', 'public.feature_requests', 'DELETE') then
    raise exception 'Browser clients can access feature requests directly.';
  end if;

  if not has_function_privilege('anon', 'public.list_public_feature_requests()', 'EXECUTE')
    or not has_function_privilege('anon', 'public.submit_feature_request(text,text,text,text)', 'EXECUTE')
    or has_function_privilege('anon', 'public.admin_list_feature_requests()', 'EXECUTE')
    or has_function_privilege('anon', 'public.admin_set_feature_request_status(uuid,text)', 'EXECUTE') then
    raise exception 'Feature-board RPC grants are incorrect.';
  end if;

  if not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public' and table_name = 'profiles'
      and column_name = 'access_status'
  ) then
    raise exception 'Admin approval migration has not been applied.';
  end if;

  if has_column_privilege('authenticated', 'public.profiles', 'access_status', 'UPDATE')
    or has_column_privilege('authenticated', 'public.profiles', 'is_admin', 'UPDATE')
    or has_column_privilege('authenticated', 'public.profiles', 'approved_at', 'UPDATE')
    or has_column_privilege('authenticated', 'public.profiles', 'approved_by', 'UPDATE') then
    raise exception 'Authenticated clients can directly change administrator-managed profile fields.';
  end if;

  if exists (
    select 1
    from pg_tables as app_table
    where app_table.schemaname = 'public'
      and app_table.tablename <> 'feature_requests'
      and not exists (
        select 1
        from pg_policies as policy
        where policy.schemaname = app_table.schemaname
          and policy.tablename = app_table.tablename
          and policy.policyname = 'Approved members only'
          and policy.permissive = 'RESTRICTIVE'
      )
  ) then
    raise exception 'One or more public tables are missing the restrictive approval policy.';
  end if;

  if exists (select 1 from public.profiles)
    and not exists (
      select 1 from public.profiles
      where is_admin and access_status = 'approved'
    ) then
    raise exception 'No approved administrator exists. Bootstrap the owner account first.';
  end if;

  if to_regprocedure('public.has_app_access()') is null
    or to_regprocedure('public.is_app_admin()') is null
    or to_regprocedure('public.get_my_membership()') is null
    or to_regprocedure('public.admin_list_members()') is null
    or to_regprocedure('public.admin_set_member_access(uuid,text)') is null
    or to_regprocedure('public.record_app_usage(integer,boolean)') is null
    or to_regprocedure('public.admin_member_analytics()') is null
    or to_regprocedure('public.refresh_exercise_records(uuid,uuid)') is null
    or to_regprocedure('public.prune_expired_sets()') is null
    or to_regprocedure('public.list_public_feature_requests()') is null
    or to_regprocedure('public.submit_feature_request(text,text,text,text)') is null
    or to_regprocedure('public.admin_list_feature_requests()') is null
    or to_regprocedure('public.admin_set_feature_request_status(uuid,text)') is null then
    raise exception 'One or more approval, analytics, retention, or feature-board functions are missing.';
  end if;

  if exists (
    select 1
    from pg_proc
    where oid in (
      to_regprocedure('public.has_app_access()'),
      to_regprocedure('public.is_app_admin()'),
      to_regprocedure('public.get_my_membership()'),
      to_regprocedure('public.admin_list_members()'),
      to_regprocedure('public.admin_set_member_access(uuid,text)'),
      to_regprocedure('public.record_app_usage(integer,boolean)'),
      to_regprocedure('public.admin_member_analytics()'),
      to_regprocedure('public.refresh_exercise_records(uuid,uuid)'),
      to_regprocedure('public.prune_expired_sets()'),
      to_regprocedure('public.list_public_feature_requests()'),
      to_regprocedure('public.submit_feature_request(text,text,text,text)'),
      to_regprocedure('public.admin_list_feature_requests()'),
      to_regprocedure('public.admin_set_feature_request_status(uuid,text)')
    )
      and not prosecdef
  ) then
    raise exception 'Approval, analytics, retention, and feature-board functions must remain security-definer functions.';
  end if;

  if not exists (
    select 1 from cron.job where jobname = 'spotter-prune-expired-sets'
  ) then
    raise exception 'The three-month raw-set retention job is missing.';
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
    'sync_exercise_to_catalog',
    'protect_profile_membership_fields',
    'refresh_exercise_records',
    'prune_expired_sets'
  )
order by routine_name, grantee;
