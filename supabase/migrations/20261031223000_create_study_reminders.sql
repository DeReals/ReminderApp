create table if not exists public.study_reminders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  subject text not null check (char_length(btrim(subject)) between 1 and 60),
  topic text not null default '' check (char_length(topic) <= 160),
  schedule_type text not null check (schedule_type in ('once', 'weekly')),
  remind_at timestamptz,
  remind_time time,
  days_of_week smallint[] not null default '{}',
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  constraint study_reminders_valid_schedule check (
    (schedule_type = 'once' and remind_at is not null and remind_time is null and cardinality(days_of_week) = 0)
    or
    (schedule_type = 'weekly' and remind_at is null and remind_time is not null
      and cardinality(days_of_week) between 1 and 7
      and days_of_week <@ array[0, 1, 2, 3, 4, 5, 6]::smallint[])
  )
);

create index if not exists study_reminders_user_enabled_idx
  on public.study_reminders (user_id, enabled);

create index if not exists study_reminders_user_schedule_idx
  on public.study_reminders (user_id, remind_at, remind_time);

alter table public.study_reminders enable row level security;

drop policy if exists "Users can view their own study reminders" on public.study_reminders;
create policy "Users can view their own study reminders"
  on public.study_reminders for select
  using ((select auth.uid()) = user_id);

drop policy if exists "Users can create their own study reminders" on public.study_reminders;
create policy "Users can create their own study reminders"
  on public.study_reminders for insert
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users can update their own study reminders" on public.study_reminders;
create policy "Users can update their own study reminders"
  on public.study_reminders for update
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users can delete their own study reminders" on public.study_reminders;
create policy "Users can delete their own study reminders"
  on public.study_reminders for delete
  using ((select auth.uid()) = user_id);

grant select, insert, update, delete on public.study_reminders to authenticated;
