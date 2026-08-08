-- sum(bigint) returns numeric in PostgreSQL. Cast usage totals back to the
-- bigint types declared by admin_member_analytics().

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
      ), 0)::bigint as app_opens_30,
      coalesce(sum(usage.database_requests), 0)::bigint as database_requests_total,
      coalesce(sum(usage.database_requests) filter (
        where usage.activity_date >= ((now() at time zone 'utc')::date - 29)
      ), 0)::bigint as database_requests_30,
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

revoke all on function public.admin_member_analytics() from public, anon;
grant execute on function public.admin_member_analytics() to authenticated;
