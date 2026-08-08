-- Cover foreign keys used by permanent exercise history and admin approval.
create index if not exists exercise_session_records_exercise_idx
  on public.exercise_session_records(exercise_id);

create index if not exists profiles_approved_by_idx
  on public.profiles(approved_by)
  where approved_by is not null;
