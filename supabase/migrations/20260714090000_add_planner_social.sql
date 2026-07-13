-- Fixed workout planner and friends-only social board.

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text not null check (username ~ '^[a-z0-9_]{3,30}$'),
  display_name text not null check (char_length(trim(display_name)) between 1 and 80),
  bio text not null default '' check (char_length(bio) <= 240),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists profiles_username_unique on public.profiles(lower(username));

create table if not exists public.friendships (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null references auth.users(id) on delete cascade,
  addressee_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted')),
  created_at timestamptz not null default now(),
  accepted_at timestamptz,
  check (requester_id <> addressee_id)
);

create unique index if not exists friendships_pair_unique
  on public.friendships (least(requester_id, addressee_id), greatest(requester_id, addressee_id));
create index if not exists friendships_requester_idx on public.friendships(requester_id, status);
create index if not exists friendships_addressee_idx on public.friendships(addressee_id, status);

create table if not exists public.routines (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(trim(name)) between 1 and 100),
  description text not null default '' check (char_length(description) <= 600),
  is_shared boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists routines_user_idx on public.routines(user_id, updated_at desc);

create table if not exists public.routine_days (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  routine_id uuid not null references public.routines(id) on delete cascade,
  name text not null check (char_length(trim(name)) between 1 and 80),
  weekday integer check (weekday between 0 and 6),
  sort_order integer not null default 0
);

create index if not exists routine_days_routine_idx on public.routine_days(routine_id, sort_order);
create index if not exists routine_days_user_idx on public.routine_days(user_id);

create table if not exists public.routine_exercises (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  routine_day_id uuid not null references public.routine_days(id) on delete cascade,
  exercise_id uuid references public.exercises(id) on delete set null,
  exercise_name text not null check (char_length(trim(exercise_name)) between 1 and 120),
  unit text not null default 'kg' check (unit in ('kg', 'lb', 'reps', 'seconds')),
  target_sets integer not null default 3 check (target_sets between 1 and 20),
  target_reps_min integer not null default 8 check (target_reps_min between 1 and 1000),
  target_reps_max integer not null default 12 check (target_reps_max between target_reps_min and 1000),
  target_weight numeric(10,2) check (target_weight >= 0),
  rest_seconds integer not null default 90 check (rest_seconds between 0 and 3600),
  notes text not null default '' check (char_length(notes) <= 400),
  sort_order integer not null default 0
);

create index if not exists routine_exercises_day_idx on public.routine_exercises(routine_day_id, sort_order);
create index if not exists routine_exercises_user_idx on public.routine_exercises(user_id);
create index if not exists routine_exercises_exercise_idx on public.routine_exercises(exercise_id);

create table if not exists public.feed_posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  post_type text not null default 'status' check (post_type in ('status', 'workout', 'routine')),
  caption text not null default '' check (char_length(caption) <= 1000),
  visibility text not null default 'friends' check (visibility in ('friends', 'public')),
  routine_id uuid references public.routines(id) on delete set null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists feed_posts_user_created_idx on public.feed_posts(user_id, created_at desc);
create index if not exists feed_posts_created_idx on public.feed_posts(created_at desc);
create index if not exists feed_posts_routine_idx on public.feed_posts(routine_id);

create table if not exists public.post_likes (
  post_id uuid not null references public.feed_posts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);

create index if not exists post_likes_user_idx on public.post_likes(user_id);

create table if not exists public.post_comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.feed_posts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  body text not null check (char_length(trim(body)) between 1 and 500),
  created_at timestamptz not null default now()
);

create index if not exists post_comments_post_idx on public.post_comments(post_id, created_at);
create index if not exists post_comments_user_idx on public.post_comments(user_id);

create or replace function public.seed_social_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  base_username text := left(coalesce(nullif(regexp_replace(lower(split_part(new.email, '@', 1)), '[^a-z0-9_]', '', 'g'), ''), 'athlete'), 20);
begin
  insert into public.profiles (id, username, display_name)
  values (
    new.id,
    base_username || '_' || left(new.id::text, 6),
    coalesce(nullif(new.raw_user_meta_data ->> 'display_name', ''), split_part(new.email, '@', 1), 'Athlete')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created_social_profile on auth.users;
create trigger on_auth_user_created_social_profile
after insert on auth.users
for each row execute function public.seed_social_profile();

insert into public.profiles (id, username, display_name)
select
  users.id,
  left(coalesce(nullif(regexp_replace(lower(split_part(users.email, '@', 1)), '[^a-z0-9_]', '', 'g'), ''), 'athlete'), 20) || '_' || left(users.id::text, 6),
  coalesce(nullif(users.raw_user_meta_data ->> 'display_name', ''), split_part(users.email, '@', 1), 'Athlete')
from auth.users as users
on conflict (id) do nothing;

create or replace function public.validate_friendship_acceptance()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.requester_id <> old.requester_id or new.addressee_id <> old.addressee_id then
    raise exception 'Friendship participants cannot be changed';
  end if;
  if old.status <> 'pending' or new.status <> 'accepted' then
    raise exception 'Only pending friend requests can be accepted';
  end if;
  new.accepted_at := coalesce(new.accepted_at, now());
  return new;
end;
$$;

drop trigger if exists friendships_validate_acceptance on public.friendships;
create trigger friendships_validate_acceptance
before update on public.friendships
for each row execute function public.validate_friendship_acceptance();

alter table public.profiles enable row level security;
alter table public.friendships enable row level security;
alter table public.routines enable row level security;
alter table public.routine_days enable row level security;
alter table public.routine_exercises enable row level security;
alter table public.feed_posts enable row level security;
alter table public.post_likes enable row level security;
alter table public.post_comments enable row level security;

create policy "Authenticated users can discover profiles" on public.profiles
for select to authenticated using (true);
create policy "Users can create their own profile" on public.profiles
for insert to authenticated with check (id = (select auth.uid()));
create policy "Users can update their own profile" on public.profiles
for update to authenticated using (id = (select auth.uid())) with check (id = (select auth.uid()));

create policy "Participants can view friendships" on public.friendships
for select to authenticated using ((select auth.uid()) in (requester_id, addressee_id));
create policy "Users can send friend requests" on public.friendships
for insert to authenticated with check (requester_id = (select auth.uid()) and status = 'pending');
create policy "Recipients can accept friend requests" on public.friendships
for update to authenticated using (addressee_id = (select auth.uid()) and status = 'pending')
with check (addressee_id = (select auth.uid()) and status = 'accepted');
create policy "Participants can remove friendships" on public.friendships
for delete to authenticated using ((select auth.uid()) in (requester_id, addressee_id));

create policy "Owners manage routines" on public.routines
for all to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "Friends view shared routines" on public.routines
for select to authenticated using (
  is_shared and exists (
    select 1 from public.friendships friendship
    where friendship.status = 'accepted'
      and ((friendship.requester_id = (select auth.uid()) and friendship.addressee_id = routines.user_id)
        or (friendship.addressee_id = (select auth.uid()) and friendship.requester_id = routines.user_id))
  )
);

create policy "Owners manage routine days" on public.routine_days
for all to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "Friends view shared routine days" on public.routine_days
for select to authenticated using (exists (select 1 from public.routines routine where routine.id = routine_days.routine_id));

create policy "Owners manage routine exercises" on public.routine_exercises
for all to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "Friends view shared routine exercises" on public.routine_exercises
for select to authenticated using (
  exists (
    select 1 from public.routine_days day
    join public.routines routine on routine.id = day.routine_id
    where day.id = routine_exercises.routine_day_id
  )
);

create policy "Users view visible feed posts" on public.feed_posts
for select to authenticated using (
  user_id = (select auth.uid())
  or visibility = 'public'
  or (visibility = 'friends' and exists (
    select 1 from public.friendships friendship
    where friendship.status = 'accepted'
      and ((friendship.requester_id = (select auth.uid()) and friendship.addressee_id = feed_posts.user_id)
        or (friendship.addressee_id = (select auth.uid()) and friendship.requester_id = feed_posts.user_id))
  ))
);
create policy "Users manage their own feed posts" on public.feed_posts
for all to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

create policy "Users view likes on visible posts" on public.post_likes
for select to authenticated using (exists (select 1 from public.feed_posts post where post.id = post_likes.post_id));
create policy "Users like visible posts" on public.post_likes
for insert to authenticated with check (
  user_id = (select auth.uid()) and exists (select 1 from public.feed_posts post where post.id = post_likes.post_id)
);
create policy "Users remove their own likes" on public.post_likes
for delete to authenticated using (user_id = (select auth.uid()));

create policy "Users view comments on visible posts" on public.post_comments
for select to authenticated using (exists (select 1 from public.feed_posts post where post.id = post_comments.post_id));
create policy "Users comment on visible posts" on public.post_comments
for insert to authenticated with check (
  user_id = (select auth.uid()) and exists (select 1 from public.feed_posts post where post.id = post_comments.post_id)
);
create policy "Users remove their own comments" on public.post_comments
for delete to authenticated using (user_id = (select auth.uid()));

revoke execute on function public.seed_social_profile() from public, anon, authenticated;
revoke execute on function public.validate_friendship_acceptance() from public, anon, authenticated;

grant select, insert, update, delete on public.profiles to authenticated;
grant select, insert, update, delete on public.friendships to authenticated;
grant select, insert, update, delete on public.routines to authenticated;
grant select, insert, update, delete on public.routine_days to authenticated;
grant select, insert, update, delete on public.routine_exercises to authenticated;
grant select, insert, update, delete on public.feed_posts to authenticated;
grant select, insert, delete on public.post_likes to authenticated;
grant select, insert, delete on public.post_comments to authenticated;
