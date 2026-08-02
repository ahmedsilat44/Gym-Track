-- Admin-controlled membership approval. New Auth users receive a pending profile
-- and cannot read or change application data until an administrator approves them.

do $$
declare
  first_install boolean;
begin
  select not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'profiles'
      and column_name = 'access_status'
  ) into first_install;

  alter table public.profiles
    add column if not exists access_status text not null default 'pending',
    add column if not exists is_admin boolean not null default false,
    add column if not exists approved_at timestamptz,
    add column if not exists approved_by uuid references auth.users(id) on delete set null;

  if first_install then
    -- Preserve access for members who existed before this migration.
    update public.profiles
    set access_status = 'approved',
        approved_at = coalesce(approved_at, now())
    where access_status = 'pending';

    -- Existing installations get one safe bootstrap administrator. Fresh projects
    -- must bootstrap their owner explicitly after signup; see README.md.
    update public.profiles
    set is_admin = true,
        access_status = 'approved',
        approved_at = coalesce(approved_at, now())
    where id = (
      select users.id
      from auth.users as users
      join public.profiles as profile on profile.id = users.id
      order by users.created_at, users.id
      limit 1
    )
    and not exists (select 1 from public.profiles where is_admin);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'profiles_valid_access_status'
      and conrelid = 'public.profiles'::regclass
  ) then
    alter table public.profiles
      add constraint profiles_valid_access_status
      check (access_status in ('pending', 'approved', 'rejected'));
  end if;
end $$;

create index if not exists profiles_access_status_created_idx
  on public.profiles(access_status, created_at desc);

create or replace function public.has_app_access()
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and access_status = 'approved'
  );
$$;

create or replace function public.is_app_admin()
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and access_status = 'approved'
      and is_admin
  );
$$;

create or replace function public.get_my_membership()
returns table(access_status text, is_admin boolean)
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select profile.access_status, profile.is_admin
  from public.profiles as profile
  where profile.id = auth.uid();
$$;

create or replace function public.admin_list_members()
returns table(
  id uuid,
  email text,
  username text,
  display_name text,
  access_status text,
  is_admin boolean,
  created_at timestamptz,
  approved_at timestamptz
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
  select
    profile.id,
    users.email::text,
    profile.username,
    profile.display_name,
    profile.access_status,
    profile.is_admin,
    profile.created_at,
    profile.approved_at
  from public.profiles as profile
  join auth.users as users on users.id = profile.id
  order by
    case profile.access_status when 'pending' then 0 when 'approved' then 1 else 2 end,
    profile.created_at desc;
end;
$$;

create or replace function public.admin_set_member_access(target_user_id uuid, new_status text)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  target_is_admin boolean;
begin
  if not public.is_app_admin() then
    raise exception 'Administrator access required' using errcode = '42501';
  end if;

  if new_status not in ('pending', 'approved', 'rejected') then
    raise exception 'Invalid membership status' using errcode = '22023';
  end if;

  select profile.is_admin
  into target_is_admin
  from public.profiles as profile
  where profile.id = target_user_id;

  if not found then
    raise exception 'Member not found' using errcode = 'P0002';
  end if;

  if target_is_admin and new_status <> 'approved' then
    raise exception 'Administrator accounts must remain approved' using errcode = '42501';
  end if;

  update public.profiles
  set access_status = new_status,
      approved_at = case when new_status = 'approved' then now() else null end,
      approved_by = case when new_status = 'approved' then auth.uid() else null end,
      updated_at = now()
  where profiles.id = target_user_id;
end;
$$;

create or replace function public.protect_profile_membership_fields()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  if (
    new.access_status is distinct from old.access_status
    or new.is_admin is distinct from old.is_admin
    or new.approved_at is distinct from old.approved_at
    or new.approved_by is distinct from old.approved_by
  ) and not public.is_app_admin() then
    raise exception 'Membership fields are administrator-managed' using errcode = '42501';
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_protect_membership_fields on public.profiles;
create trigger profiles_protect_membership_fields
before update on public.profiles
for each row execute function public.protect_profile_membership_fields();

-- Pending and rejected accounts cannot reach any application table. Restrictive
-- policies combine with existing ownership/social policies instead of replacing them.
do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'categories', 'exercises', 'sessions', 'session_exercises', 'sets',
    'personal_records', 'user_preferences', 'profiles', 'friendships',
    'routines', 'routine_days', 'routine_exercises', 'feed_posts',
    'post_likes', 'post_comments', 'exercise_catalog'
  ]
  loop
    if to_regclass(format('public.%I', table_name)) is not null then
      execute format('drop policy if exists "Approved members only" on public.%I', table_name);
      execute format(
        'create policy "Approved members only" on public.%I as restrictive for all to authenticated using (public.has_app_access()) with check (public.has_app_access())',
        table_name
      );
    end if;
  end loop;
end $$;

drop policy if exists "Authenticated users can discover profiles" on public.profiles;
drop policy if exists "Approved users can discover profiles" on public.profiles;
create policy "Approved users can discover profiles" on public.profiles
for select to authenticated
using (access_status = 'approved');

-- Browser clients may edit public profile content, never approval or admin flags.
revoke update on public.profiles from authenticated;
grant update (username, display_name, bio, updated_at) on public.profiles to authenticated;

revoke all on function public.has_app_access() from public, anon;
revoke all on function public.is_app_admin() from public, anon;
revoke all on function public.get_my_membership() from public, anon;
revoke all on function public.admin_list_members() from public, anon;
revoke all on function public.admin_set_member_access(uuid, text) from public, anon;
revoke all on function public.protect_profile_membership_fields() from public, anon, authenticated;

grant execute on function public.has_app_access() to authenticated;
grant execute on function public.is_app_admin() to authenticated;
grant execute on function public.get_my_membership() to authenticated;
grant execute on function public.admin_list_members() to authenticated;
grant execute on function public.admin_set_member_access(uuid, text) to authenticated;
