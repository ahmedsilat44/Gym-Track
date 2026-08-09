-- Public feature board. Anyone may submit a bounded request, but only requests
-- approved by an application administrator become publicly readable.

create table if not exists public.feature_requests (
  id uuid primary key default gen_random_uuid(),
  submitted_by uuid references auth.users(id) on delete set null,
  submitter_name text not null,
  submitter_email text not null,
  title text not null,
  description text not null,
  status text not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  approved_at timestamptz,
  approved_by uuid references auth.users(id) on delete set null,
  constraint feature_requests_valid_name check (
    char_length(btrim(submitter_name)) between 2 and 80
  ),
  constraint feature_requests_valid_email check (
    char_length(btrim(submitter_email)) between 5 and 254
    and btrim(submitter_email) ~* '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
  ),
  constraint feature_requests_valid_title check (
    char_length(btrim(title)) between 5 and 120
  ),
  constraint feature_requests_valid_description check (
    char_length(btrim(description)) between 10 and 1200
  ),
  constraint feature_requests_valid_status check (
    status in ('pending', 'approved', 'planned', 'completed', 'rejected')
  )
);

create index if not exists feature_requests_public_status_idx
  on public.feature_requests(status, approved_at desc)
  where status in ('approved', 'planned', 'completed');

create index if not exists feature_requests_admin_queue_idx
  on public.feature_requests(status, created_at desc);

create unique index if not exists feature_requests_pending_submitter_title_idx
  on public.feature_requests(lower(submitter_email), lower(title))
  where status = 'pending';

alter table public.feature_requests enable row level security;
revoke all on table public.feature_requests from public, anon, authenticated;

create or replace function public.list_public_feature_requests()
returns table(
  id uuid,
  title text,
  description text,
  status text,
  created_at timestamptz,
  approved_at timestamptz
)
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select
    request.id,
    request.title,
    request.description,
    request.status,
    request.created_at,
    request.approved_at
  from public.feature_requests as request
  where request.status in ('approved', 'planned', 'completed')
  order by
    case request.status when 'planned' then 0 when 'approved' then 1 else 2 end,
    request.approved_at desc nulls last,
    request.created_at desc;
$$;

create or replace function public.submit_feature_request(
  request_title text,
  request_description text,
  request_submitter_name text,
  request_submitter_email text
)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  created_id uuid;
begin
  if char_length(btrim(coalesce(request_title, ''))) not between 5 and 120 then
    raise exception 'Feature title must be between 5 and 120 characters' using errcode = '22023';
  end if;
  if char_length(btrim(coalesce(request_description, ''))) not between 10 and 1200 then
    raise exception 'Feature description must be between 10 and 1200 characters' using errcode = '22023';
  end if;
  if char_length(btrim(coalesce(request_submitter_name, ''))) not between 2 and 80 then
    raise exception 'Name must be between 2 and 80 characters' using errcode = '22023';
  end if;
  if char_length(btrim(coalesce(request_submitter_email, ''))) not between 5 and 254
    or btrim(request_submitter_email) !~* '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then
    raise exception 'Enter a valid email address' using errcode = '22023';
  end if;

  insert into public.feature_requests (
    submitted_by,
    submitter_name,
    submitter_email,
    title,
    description
  ) values (
    auth.uid(),
    btrim(request_submitter_name),
    lower(btrim(request_submitter_email)),
    btrim(request_title),
    btrim(request_description)
  )
  returning id into created_id;

  return created_id;
exception
  when unique_violation then
    raise exception 'This feature is already waiting for review' using errcode = '23505';
end;
$$;

create or replace function public.admin_list_feature_requests()
returns table(
  id uuid,
  submitted_by uuid,
  submitter_name text,
  submitter_email text,
  title text,
  description text,
  status text,
  created_at timestamptz,
  updated_at timestamptz,
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
    request.id,
    request.submitted_by,
    request.submitter_name,
    request.submitter_email,
    request.title,
    request.description,
    request.status,
    request.created_at,
    request.updated_at,
    request.approved_at
  from public.feature_requests as request
  order by
    case request.status when 'pending' then 0 when 'planned' then 1 when 'approved' then 2 when 'completed' then 3 else 4 end,
    request.created_at desc;
end;
$$;

create or replace function public.admin_set_feature_request_status(
  target_request_id uuid,
  new_status text
)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  if not public.is_app_admin() then
    raise exception 'Administrator access required' using errcode = '42501';
  end if;
  if new_status not in ('pending', 'approved', 'planned', 'completed', 'rejected') then
    raise exception 'Invalid feature request status' using errcode = '22023';
  end if;

  update public.feature_requests
  set status = new_status,
      updated_at = now(),
      approved_at = case
        when new_status in ('approved', 'planned', 'completed') then coalesce(approved_at, now())
        else null
      end,
      approved_by = case
        when new_status in ('approved', 'planned', 'completed') then auth.uid()
        else null
      end
  where id = target_request_id;

  if not found then
    raise exception 'Feature request not found' using errcode = 'P0002';
  end if;
end;
$$;

revoke all on function public.list_public_feature_requests() from public;
revoke all on function public.submit_feature_request(text, text, text, text) from public;
revoke all on function public.admin_list_feature_requests() from public;
revoke all on function public.admin_set_feature_request_status(uuid, text) from public;

grant execute on function public.list_public_feature_requests() to anon, authenticated;
grant execute on function public.submit_feature_request(text, text, text, text) to anon, authenticated;
grant execute on function public.admin_list_feature_requests() to authenticated;
grant execute on function public.admin_set_feature_request_status(uuid, text) to authenticated;
