-- Privacy-safe capacity analytics. Stores daily counters only: no SQL text,
-- request paths, payloads, IP addresses, or user-agent strings.

create table if not exists public.app_usage_daily (
  user_id uuid not null references auth.users(id) on delete cascade,
  activity_date date not null default ((now() at time zone 'utc')::date),
  database_requests bigint not null default 0 check (database_requests >= 0),
  app_opens integer not null default 0 check (app_opens >= 0),
  last_seen_at timestamptz not null default now(),
  primary key (user_id, activity_date)
);

create index if not exists app_usage_daily_date_idx
  on public.app_usage_daily(activity_date desc);

alter table public.app_usage_daily enable row level security;

drop policy if exists "Approved members only" on public.app_usage_daily;
create policy "Approved members only" on public.app_usage_daily
as restrictive for all to authenticated
using (public.has_app_access())
with check (public.has_app_access());

-- Direct table access is unnecessary. Members write counters through the narrow
-- RPC below; administrators read aggregates through admin_member_analytics().
revoke all on table public.app_usage_daily from public, anon, authenticated;

create or replace function public.record_app_usage(
  database_request_count integer default 0,
  record_app_open boolean default false
)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  caller_id uuid := auth.uid();
  utc_date date := (now() at time zone 'utc')::date;
begin
  if caller_id is null or not public.has_app_access() then
    raise exception 'Approved member access required' using errcode = '42501';
  end if;

  if database_request_count < 0 or database_request_count > 10000 then
    raise exception 'Invalid database request count' using errcode = '22023';
  end if;

  if database_request_count = 0 and not record_app_open then
    return;
  end if;

  insert into public.app_usage_daily (
    user_id, activity_date, database_requests, app_opens, last_seen_at
  ) values (
    caller_id,
    utc_date,
    database_request_count,
    case when record_app_open then 1 else 0 end,
    now()
  )
  on conflict (user_id, activity_date) do update set
    database_requests = public.app_usage_daily.database_requests + excluded.database_requests,
    app_opens = public.app_usage_daily.app_opens + excluded.app_opens,
    last_seen_at = greatest(public.app_usage_daily.last_seen_at, excluded.last_seen_at);
end;
$$;

create or replace function public.admin_member_analytics()
returns table(
  user_id uuid,
  last_active_at timestamptz,
  active_days_30 bigint,
  app_opens_30 bigint,
  workouts_total bigint,
  workouts_30 bigint,
  routines_total bigint,
  routines_30 bigint,
  database_requests_total bigint,
  database_requests_30 bigint,
  avg_database_requests_per_active_day numeric
)
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  if not public.is_app_admin() then
    raise exception 'Administrator access required' using errcode = '42501';
  end if;

  return query
  with workout_stats as (
    select
      session.user_id,
      count(*) filter (where session.ended_at is not null) as workouts_total,
      count(*) filter (
        where session.ended_at is not null
          and session.started_at >= now() - interval '30 days'
      ) as workouts_30,
      max(coalesce(session.ended_at, session.started_at)) as last_workout_at
    from public.sessions as session
    group by session.user_id
  ),
  routine_stats as (
    select
      routine.user_id,
      count(*) as routines_total,
      count(*) filter (where routine.created_at >= now() - interval '30 days') as routines_30,
      max(routine.updated_at) as last_routine_at
    from public.routines as routine
    group by routine.user_id
  ),
  usage_stats as (
    select
      usage.user_id,
      count(*) filter (
        where usage.activity_date >= ((now() at time zone 'utc')::date - 29)
          and (usage.database_requests > 0 or usage.app_opens > 0)
      ) as active_days_30,
      coalesce(sum(usage.app_opens) filter (
        where usage.activity_date >= ((now() at time zone 'utc')::date - 29)
      ), 0) as app_opens_30,
      coalesce(sum(usage.database_requests), 0) as database_requests_total,
      coalesce(sum(usage.database_requests) filter (
        where usage.activity_date >= ((now() at time zone 'utc')::date - 29)
      ), 0) as database_requests_30,
      max(usage.last_seen_at) as last_seen_at
    from public.app_usage_daily as usage
    group by usage.user_id
  )
  select
    profile.id,
    greatest(usage.last_seen_at, workout.last_workout_at, routine.last_routine_at),
    coalesce(usage.active_days_30, 0),
    coalesce(usage.app_opens_30, 0),
    coalesce(workout.workouts_total, 0),
    coalesce(workout.workouts_30, 0),
    coalesce(routine.routines_total, 0),
    coalesce(routine.routines_30, 0),
    coalesce(usage.database_requests_total, 0),
    coalesce(usage.database_requests_30, 0),
    case
      when coalesce(usage.active_days_30, 0) = 0 then 0
      else round(usage.database_requests_30::numeric / usage.active_days_30, 1)
    end
  from public.profiles as profile
  left join workout_stats as workout on workout.user_id = profile.id
  left join routine_stats as routine on routine.user_id = profile.id
  left join usage_stats as usage on usage.user_id = profile.id
  order by greatest(usage.last_seen_at, workout.last_workout_at, routine.last_routine_at) desc nulls last;
end;
$$;

revoke all on function public.record_app_usage(integer, boolean) from public, anon;
revoke all on function public.admin_member_analytics() from public, anon;
grant execute on function public.record_app_usage(integer, boolean) to authenticated;
grant execute on function public.admin_member_analytics() to authenticated;
