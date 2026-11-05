alter table public.study_reminders
  add column if not exists completed_on date;
