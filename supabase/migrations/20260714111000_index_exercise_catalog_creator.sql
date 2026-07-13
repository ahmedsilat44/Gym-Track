-- Cover the catalog creator foreign key for account deletion and maintenance.

create index if not exists exercise_catalog_created_by_idx
  on public.exercise_catalog(created_by);
