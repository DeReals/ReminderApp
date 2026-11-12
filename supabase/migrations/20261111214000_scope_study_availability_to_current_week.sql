alter table public.study_availability
  add column if not exists week_start date;

update public.study_availability
set week_start = current_date - extract(dow from current_date)::integer
where week_start is null;

alter table public.study_availability
  alter column week_start set not null;

create index if not exists study_availability_user_week_start_idx
  on public.study_availability (user_id, week_start, weekday);
