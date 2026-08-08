-- Keep detailed working sets for three months. Keep one compact best-performance
-- record per exercise/session forever so long-term PRs and progress graphs survive.

create table if not exists public.exercise_session_records (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  session_id uuid not null references public.sessions(id) on delete cascade,
  exercise_id uuid not null references public.exercises(id) on delete cascade,
  best_weight numeric(10,2) not null check (best_weight >= 0),
  best_reps_at_weight integer not null check (best_reps_at_weight > 0),
  best_est_1rm numeric(12,3) not null check (best_est_1rm >= 0),
  is_all_time_pr boolean not null default false,
  recorded_at timestamptz not null,
  created_at timestamptz not null default now(),
  unique (user_id, session_id, exercise_id)
);

create index if not exists exercise_session_records_user_exercise_date_idx
  on public.exercise_session_records(user_id, exercise_id, recorded_at desc);
create index if not exists exercise_session_records_session_idx
  on public.exercise_session_records(session_id);

alter table public.exercise_session_records enable row level security;

drop policy if exists "Users view their own session records" on public.exercise_session_records;
create policy "Users view their own session records" on public.exercise_session_records
for select to authenticated
using (user_id = (select auth.uid()));

drop policy if exists "Approved members only" on public.exercise_session_records;
create policy "Approved members only" on public.exercise_session_records
as restrictive for all to authenticated
using (public.has_app_access())
with check (public.has_app_access());

revoke all on table public.exercise_session_records from public, anon, authenticated;
grant select on table public.exercise_session_records to authenticated;

create or replace function public.refresh_exercise_records(
  target_user_id uuid,
  target_exercise_id uuid
)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  best_performance public.exercise_session_records%rowtype;
  heaviest public.exercise_session_records%rowtype;
  bodyweight_exercise boolean;
begin
  select exercise.is_bodyweight or exercise.unit in ('reps', 'seconds')
  into bodyweight_exercise
  from public.exercises as exercise
  where exercise.id = target_exercise_id;

  with history as (
    select
      record.id,
      case
        when coalesce(bodyweight_exercise, false) then
          record.best_reps_at_weight > coalesce(max(record.best_reps_at_weight) over (
            order by record.recorded_at, record.session_id
            rows between unbounded preceding and 1 preceding
          ), 0)
        else
          record.best_est_1rm > coalesce(max(record.best_est_1rm) over (
            order by record.recorded_at, record.session_id
            rows between unbounded preceding and 1 preceding
          ), -1)
          or record.best_weight > coalesce(max(record.best_weight) over (
            order by record.recorded_at, record.session_id
            rows between unbounded preceding and 1 preceding
          ), -1)
      end as is_pr
    from public.exercise_session_records as record
    where record.user_id = target_user_id
      and record.exercise_id = target_exercise_id
  )
  update public.exercise_session_records as record
  set is_all_time_pr = history.is_pr
  from history
  where record.id = history.id
    and record.is_all_time_pr is distinct from history.is_pr;

  select record.*
  into best_performance
  from public.exercise_session_records as record
  where record.user_id = target_user_id
    and record.exercise_id = target_exercise_id
  order by
    case when coalesce(bodyweight_exercise, false) then record.best_reps_at_weight::numeric else record.best_est_1rm end desc,
    record.best_weight desc,
    record.recorded_at asc
  limit 1;

  if not found then
    delete from public.personal_records
    where user_id = target_user_id and exercise_id = target_exercise_id;
    return;
  end if;

  select record.*
  into heaviest
  from public.exercise_session_records as record
  where record.user_id = target_user_id
    and record.exercise_id = target_exercise_id
  order by record.best_weight desc, record.best_reps_at_weight desc, record.recorded_at asc
  limit 1;

  insert into public.personal_records (
    user_id, exercise_id, best_weight, best_reps_at_weight,
    best_est_1rm, achieved_at, set_id
  ) values (
    target_user_id, target_exercise_id, heaviest.best_weight,
    heaviest.best_reps_at_weight, best_performance.best_est_1rm,
    best_performance.recorded_at, null
  )
  on conflict (user_id, exercise_id) do update set
    best_weight = excluded.best_weight,
    best_reps_at_weight = excluded.best_reps_at_weight,
    best_est_1rm = excluded.best_est_1rm,
    achieved_at = excluded.achieved_at,
    set_id = null;
end;
$$;

-- Backfill one durable point for every existing exercise/session before cleanup.
with ranked_sets as (
  select
    logged.user_id,
    logged.session_id,
    logged.exercise_id,
    logged.weight,
    logged.reps,
    logged.weight * (1 + logged.reps::numeric / 30) as estimated_1rm,
    session.started_at,
    row_number() over (
      partition by logged.user_id, logged.session_id, logged.exercise_id
      order by logged.weight * (1 + logged.reps::numeric / 30) desc, logged.weight desc, logged.reps desc
    ) as estimate_rank,
    row_number() over (
      partition by logged.user_id, logged.session_id, logged.exercise_id
      order by logged.weight desc, logged.reps desc
    ) as weight_rank
  from public.sets as logged
  join public.sessions as session on session.id = logged.session_id
),
best_estimates as (
  select * from ranked_sets where estimate_rank = 1
),
heaviest_sets as (
  select * from ranked_sets where weight_rank = 1
)
insert into public.exercise_session_records (
  user_id, session_id, exercise_id, best_weight,
  best_reps_at_weight, best_est_1rm, recorded_at
)
select
  estimate.user_id,
  estimate.session_id,
  estimate.exercise_id,
  heaviest.weight,
  heaviest.reps,
  estimate.estimated_1rm,
  estimate.started_at
from best_estimates as estimate
join heaviest_sets as heaviest
  on heaviest.user_id = estimate.user_id
  and heaviest.session_id = estimate.session_id
  and heaviest.exercise_id = estimate.exercise_id
on conflict (user_id, session_id, exercise_id) do nothing;

do $$
declare
  item record;
begin
  for item in
    select distinct user_id, exercise_id
    from public.exercise_session_records
  loop
    perform public.refresh_exercise_records(item.user_id, item.exercise_id);
  end loop;
end;
$$;

create or replace function public.record_inserted_set()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  current_record public.personal_records%rowtype;
  session_started_at timestamptz;
  bodyweight_exercise boolean;
  new_est numeric := new.weight * (1 + new.reps::numeric / 30);
  is_new_record boolean := false;
begin
  select session.started_at
  into session_started_at
  from public.sessions as session
  where session.id = new.session_id;

  select exercise.is_bodyweight or exercise.unit in ('reps', 'seconds')
  into bodyweight_exercise
  from public.exercises as exercise
  where exercise.id = new.exercise_id;

  select * into current_record
  from public.personal_records
  where user_id = new.user_id and exercise_id = new.exercise_id
  for update;

  is_new_record := not found
    or (coalesce(bodyweight_exercise, false) and new.reps > coalesce(current_record.best_reps_at_weight, 0))
    or (not coalesce(bodyweight_exercise, false) and (
      new_est > coalesce(current_record.best_est_1rm, 0)
      or new.weight > coalesce(current_record.best_weight, 0)
    ));

  if is_new_record then
    update public.sets set is_pr = true where id = new.id;
  end if;

  insert into public.exercise_session_records (
    user_id, session_id, exercise_id, best_weight,
    best_reps_at_weight, best_est_1rm, is_all_time_pr, recorded_at
  ) values (
    new.user_id, new.session_id, new.exercise_id, new.weight,
    new.reps, new_est, is_new_record, session_started_at
  )
  on conflict (user_id, session_id, exercise_id) do update set
    best_reps_at_weight = case
      when excluded.best_weight > public.exercise_session_records.best_weight then excluded.best_reps_at_weight
      when excluded.best_weight = public.exercise_session_records.best_weight then greatest(public.exercise_session_records.best_reps_at_weight, excluded.best_reps_at_weight)
      else public.exercise_session_records.best_reps_at_weight
    end,
    best_weight = greatest(public.exercise_session_records.best_weight, excluded.best_weight),
    best_est_1rm = greatest(public.exercise_session_records.best_est_1rm, excluded.best_est_1rm),
    is_all_time_pr = public.exercise_session_records.is_all_time_pr or excluded.is_all_time_pr;

  perform public.refresh_exercise_records(new.user_id, new.exercise_id);
  return new;
end;
$$;

create or replace function public.record_deleted_set()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  best_est public.sets%rowtype;
  heaviest public.sets%rowtype;
begin
  -- Retention deletion preserves the compact permanent session record.
  if old.created_at < now() - interval '3 months' then
    return old;
  end if;

  select * into best_est
  from public.sets
  where user_id = old.user_id
    and session_id = old.session_id
    and exercise_id = old.exercise_id
  order by (weight * (1 + reps::numeric / 30)) desc, weight desc, reps desc
  limit 1;

  if not found then
    delete from public.exercise_session_records
    where user_id = old.user_id
      and session_id = old.session_id
      and exercise_id = old.exercise_id;
    perform public.refresh_exercise_records(old.user_id, old.exercise_id);
    return old;
  end if;

  select * into heaviest
  from public.sets
  where user_id = old.user_id
    and session_id = old.session_id
    and exercise_id = old.exercise_id
  order by weight desc, reps desc
  limit 1;

  update public.exercise_session_records
  set best_weight = heaviest.weight,
      best_reps_at_weight = heaviest.reps,
      best_est_1rm = best_est.weight * (1 + best_est.reps::numeric / 30)
  where user_id = old.user_id
    and session_id = old.session_id
    and exercise_id = old.exercise_id;

  perform public.refresh_exercise_records(old.user_id, old.exercise_id);
  return old;
end;
$$;

drop trigger if exists sets_record_insert on public.sets;
drop trigger if exists sets_record_delete on public.sets;
create trigger sets_record_insert after insert on public.sets
for each row execute function public.record_inserted_set();
create trigger sets_record_delete after delete on public.sets
for each row execute function public.record_deleted_set();

create or replace function public.prune_expired_sets()
returns bigint
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  deleted_count bigint;
begin
  delete from public.sets
  where created_at < now() - interval '3 months';
  get diagnostics deleted_count = row_count;
  return deleted_count;
end;
$$;

revoke all on function public.refresh_exercise_records(uuid, uuid) from public, anon, authenticated;
revoke all on function public.record_inserted_set() from public, anon, authenticated;
revoke all on function public.record_deleted_set() from public, anon, authenticated;
revoke all on function public.prune_expired_sets() from public, anon, authenticated;

-- Supabase Cron runs retention inside Postgres every day at 03:15 UTC.
create extension if not exists pg_cron;
select cron.schedule(
  'spotter-prune-expired-sets',
  '15 3 * * *',
  'select public.prune_expired_sets();'
);
