-- Enforce cross-table ownership and least privilege for browser clients.

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'sessions_valid_time_range') then
    alter table public.sessions
      add constraint sessions_valid_time_range
      check (ended_at is null or ended_at >= started_at);
  end if;

  if not exists (select 1 from pg_constraint where conname = 'friendships_valid_acceptance_time') then
    alter table public.friendships
      add constraint friendships_valid_acceptance_time
      check ((status = 'pending' and accepted_at is null) or (status = 'accepted' and accepted_at is not null));
  end if;

  if not exists (select 1 from pg_constraint where conname = 'feed_posts_routine_type_link') then
    alter table public.feed_posts
      add constraint feed_posts_routine_type_link
      check (routine_id is null or post_type = 'routine');
  end if;

  if not exists (select 1 from pg_constraint where conname = 'feed_posts_metadata_object_size') then
    alter table public.feed_posts
      add constraint feed_posts_metadata_object_size
      check (jsonb_typeof(metadata) = 'object' and octet_length(metadata::text) <= 32768);
  end if;
end $$;

-- Exercises may only point at categories owned by the same authenticated user.
drop policy if exists "Users manage their own rows" on public.exercises;
create policy "Users view their own exercises" on public.exercises
for select to authenticated using (user_id = (select auth.uid()));
create policy "Users create valid exercises" on public.exercises
for insert to authenticated with check (
  user_id = (select auth.uid())
  and (category_id is null or exists (
    select 1 from public.categories category
    where category.id = exercises.category_id and category.user_id = (select auth.uid())
  ))
);
create policy "Users update valid exercises" on public.exercises
for update to authenticated using (user_id = (select auth.uid())) with check (
  user_id = (select auth.uid())
  and (category_id is null or exists (
    select 1 from public.categories category
    where category.id = exercises.category_id and category.user_id = (select auth.uid())
  ))
);
create policy "Users delete their own exercises" on public.exercises
for delete to authenticated using (user_id = (select auth.uid()));

-- Sessions may only point at one of the user's categories.
drop policy if exists "Users manage their own rows" on public.sessions;
create policy "Users view their own sessions" on public.sessions
for select to authenticated using (user_id = (select auth.uid()));
create policy "Users create valid sessions" on public.sessions
for insert to authenticated with check (
  user_id = (select auth.uid())
  and (category_id is null or exists (
    select 1 from public.categories category
    where category.id = sessions.category_id and category.user_id = (select auth.uid())
  ))
);
create policy "Users update valid sessions" on public.sessions
for update to authenticated using (user_id = (select auth.uid())) with check (
  user_id = (select auth.uid())
  and (category_id is null or exists (
    select 1 from public.categories category
    where category.id = sessions.category_id and category.user_id = (select auth.uid())
  ))
);
create policy "Users delete their own sessions" on public.sessions
for delete to authenticated using (user_id = (select auth.uid()));

-- Active-session exercises must link the user's own session and exercise.
drop policy if exists "Users manage their own rows" on public.session_exercises;
create policy "Users view their session exercises" on public.session_exercises
for select to authenticated using (user_id = (select auth.uid()));
create policy "Users create valid session exercises" on public.session_exercises
for insert to authenticated with check (
  user_id = (select auth.uid())
  and exists (
    select 1 from public.sessions session
    where session.id = session_exercises.session_id and session.user_id = (select auth.uid())
  )
  and exists (
    select 1 from public.exercises exercise
    where exercise.id = session_exercises.exercise_id and exercise.user_id = (select auth.uid())
  )
);
create policy "Users delete their session exercises" on public.session_exercises
for delete to authenticated using (user_id = (select auth.uid()));
revoke update on public.session_exercises from authenticated;

-- Sets must belong to the user's session and to an exercise selected for it.
drop policy if exists "Users manage their own rows" on public.sets;
create policy "Users view their own sets" on public.sets
for select to authenticated using (user_id = (select auth.uid()));
create policy "Users create valid sets" on public.sets
for insert to authenticated with check (
  user_id = (select auth.uid())
  and exists (
    select 1 from public.sessions session
    where session.id = sets.session_id and session.user_id = (select auth.uid())
  )
  and exists (
    select 1 from public.exercises exercise
    where exercise.id = sets.exercise_id and exercise.user_id = (select auth.uid())
  )
  and exists (
    select 1 from public.session_exercises selected
    where selected.session_id = sets.session_id
      and selected.exercise_id = sets.exercise_id
      and selected.user_id = (select auth.uid())
  )
);
create policy "Users delete their own sets" on public.sets
for delete to authenticated using (user_id = (select auth.uid()));
revoke update on public.sets from authenticated;

-- Personal records are trigger-derived and must never be forged by clients.
drop policy if exists "Users manage their own rows" on public.personal_records;
create policy "Users view their own personal records" on public.personal_records
for select to authenticated using (user_id = (select auth.uid()));
revoke insert, update, delete on public.personal_records from authenticated;

-- Routine children must always belong to the same owner as their parent.
drop policy if exists "Owners create routine days" on public.routine_days;
drop policy if exists "Owners update routine days" on public.routine_days;
create policy "Owners create valid routine days" on public.routine_days
for insert to authenticated with check (
  user_id = (select auth.uid())
  and exists (
    select 1 from public.routines routine
    where routine.id = routine_days.routine_id and routine.user_id = (select auth.uid())
  )
);
create policy "Owners update valid routine days" on public.routine_days
for update to authenticated using (user_id = (select auth.uid())) with check (
  user_id = (select auth.uid())
  and exists (
    select 1 from public.routines routine
    where routine.id = routine_days.routine_id and routine.user_id = (select auth.uid())
  )
);

drop policy if exists "Owners create routine exercises" on public.routine_exercises;
drop policy if exists "Owners update routine exercises" on public.routine_exercises;
create policy "Owners create valid routine exercises" on public.routine_exercises
for insert to authenticated with check (
  user_id = (select auth.uid())
  and exists (
    select 1 from public.routine_days day
    where day.id = routine_exercises.routine_day_id and day.user_id = (select auth.uid())
  )
  and (exercise_id is null or exists (
    select 1 from public.exercises exercise
    where exercise.id = routine_exercises.exercise_id and exercise.user_id = (select auth.uid())
  ))
);
create policy "Owners update valid routine exercises" on public.routine_exercises
for update to authenticated using (user_id = (select auth.uid())) with check (
  user_id = (select auth.uid())
  and exists (
    select 1 from public.routine_days day
    where day.id = routine_exercises.routine_day_id and day.user_id = (select auth.uid())
  )
  and (exercise_id is null or exists (
    select 1 from public.exercises exercise
    where exercise.id = routine_exercises.exercise_id and exercise.user_id = (select auth.uid())
  ))
);

-- A routine-linked post may only point at the author's own routine.
drop policy if exists "Users create their own feed posts" on public.feed_posts;
drop policy if exists "Users update their own feed posts" on public.feed_posts;
create policy "Users create valid feed posts" on public.feed_posts
for insert to authenticated with check (
  user_id = (select auth.uid())
  and (routine_id is null or exists (
    select 1 from public.routines routine
    where routine.id = feed_posts.routine_id and routine.user_id = (select auth.uid())
  ))
);
create policy "Users update valid feed posts" on public.feed_posts
for update to authenticated using (user_id = (select auth.uid())) with check (
  user_id = (select auth.uid())
  and (routine_id is null or exists (
    select 1 from public.routines routine
    where routine.id = feed_posts.routine_id and routine.user_id = (select auth.uid())
  ))
);
