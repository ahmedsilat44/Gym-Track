-- Keep one SELECT policy per shared table, while retaining owner-only writes.

drop policy if exists "Owners manage routines" on public.routines;
drop policy if exists "Friends view shared routines" on public.routines;
create policy "Users view available routines" on public.routines
for select to authenticated using (
  user_id = (select auth.uid())
  or (is_shared and exists (
    select 1 from public.friendships friendship
    where friendship.status = 'accepted'
      and ((friendship.requester_id = (select auth.uid()) and friendship.addressee_id = routines.user_id)
        or (friendship.addressee_id = (select auth.uid()) and friendship.requester_id = routines.user_id))
  ))
);
create policy "Owners create routines" on public.routines
for insert to authenticated with check (user_id = (select auth.uid()));
create policy "Owners update routines" on public.routines
for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "Owners delete routines" on public.routines
for delete to authenticated using (user_id = (select auth.uid()));

drop policy if exists "Owners manage routine days" on public.routine_days;
drop policy if exists "Friends view shared routine days" on public.routine_days;
create policy "Users view available routine days" on public.routine_days
for select to authenticated using (
  user_id = (select auth.uid())
  or exists (select 1 from public.routines routine where routine.id = routine_days.routine_id)
);
create policy "Owners create routine days" on public.routine_days
for insert to authenticated with check (user_id = (select auth.uid()));
create policy "Owners update routine days" on public.routine_days
for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "Owners delete routine days" on public.routine_days
for delete to authenticated using (user_id = (select auth.uid()));

drop policy if exists "Owners manage routine exercises" on public.routine_exercises;
drop policy if exists "Friends view shared routine exercises" on public.routine_exercises;
create policy "Users view available routine exercises" on public.routine_exercises
for select to authenticated using (
  user_id = (select auth.uid())
  or exists (select 1 from public.routine_days day where day.id = routine_exercises.routine_day_id)
);
create policy "Owners create routine exercises" on public.routine_exercises
for insert to authenticated with check (user_id = (select auth.uid()));
create policy "Owners update routine exercises" on public.routine_exercises
for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "Owners delete routine exercises" on public.routine_exercises
for delete to authenticated using (user_id = (select auth.uid()));

drop policy if exists "Users manage their own feed posts" on public.feed_posts;
create policy "Users create their own feed posts" on public.feed_posts
for insert to authenticated with check (user_id = (select auth.uid()));
create policy "Users update their own feed posts" on public.feed_posts
for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "Users delete their own feed posts" on public.feed_posts
for delete to authenticated using (user_id = (select auth.uid()));
