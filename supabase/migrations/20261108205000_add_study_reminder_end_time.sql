alter table public.study_reminders
  add column if not exists remind_end_time time;
