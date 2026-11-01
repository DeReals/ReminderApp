alter table public.study_reminders
  add column if not exists review_count integer not null default 0
  check (review_count >= 0);

alter table public.study_reminders
  drop constraint if exists study_reminders_valid_schedule;

alter table public.study_reminders
  drop constraint if exists study_reminders_schedule_type_check;

alter table public.study_reminders
  add constraint study_reminders_schedule_type_check
  check (schedule_type in ('once', 'weekly', 'spaced'));

alter table public.study_reminders
  add constraint study_reminders_valid_schedule check (
    (schedule_type = 'once' and remind_at is not null and remind_time is null and cardinality(days_of_week) = 0)
    or
    (schedule_type = 'weekly' and remind_at is null and remind_time is not null
      and cardinality(days_of_week) between 1 and 7
      and days_of_week <@ array[0, 1, 2, 3, 4, 5, 6]::smallint[])
    or
    (schedule_type = 'spaced' and remind_at is not null and remind_time is null and cardinality(days_of_week) = 0)
  );
