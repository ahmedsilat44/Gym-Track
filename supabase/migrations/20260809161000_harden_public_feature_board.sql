-- Keep direct table access explicitly denied and cover moderation foreign keys.

drop policy if exists "No direct feature request access" on public.feature_requests;
create policy "No direct feature request access" on public.feature_requests
for all to public
using (false)
with check (false);

create index if not exists feature_requests_submitted_by_idx
  on public.feature_requests(submitted_by)
  where submitted_by is not null;

create index if not exists feature_requests_approved_by_idx
  on public.feature_requests(approved_by)
  where approved_by is not null;
