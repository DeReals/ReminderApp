create table if not exists public.discipline_habits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null check (char_length(btrim(title)) between 1 and 70),
  minimum_action text not null check (char_length(btrim(minimum_action)) between 1 and 120),
  days_of_week smallint[] not null check (
    cardinality(days_of_week) between 1 and 7
    and days_of_week <@ array[0, 1, 2, 3, 4, 5, 6]::smallint[]
  ),
  cue_time time,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists discipline_habits_user_active_idx
  on public.discipline_habits (user_id, active);

create table if not exists public.discipline_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  habit_id uuid not null references public.discipline_habits (id) on delete cascade,
  completed_on date not null default current_date,
  created_at timestamptz not null default now(),
  constraint discipline_logs_one_checkin_per_day unique (habit_id, completed_on)
);

create index if not exists discipline_logs_user_date_idx
  on public.discipline_logs (user_id, completed_on desc);

alter table public.discipline_habits enable row level security;
alter table public.discipline_logs enable row level security;

drop policy if exists "Users can view their own discipline habits" on public.discipline_habits;
create policy "Users can view their own discipline habits"
  on public.discipline_habits for select
  using ((select auth.uid()) = user_id);

drop policy if exists "Users can create their own discipline habits" on public.discipline_habits;
create policy "Users can create their own discipline habits"
  on public.discipline_habits for insert
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users can update their own discipline habits" on public.discipline_habits;
create policy "Users can update their own discipline habits"
  on public.discipline_habits for update
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users can delete their own discipline habits" on public.discipline_habits;
create policy "Users can delete their own discipline habits"
  on public.discipline_habits for delete
  using ((select auth.uid()) = user_id);

drop policy if exists "Users can view their own discipline logs" on public.discipline_logs;
create policy "Users can view their own discipline logs"
  on public.discipline_logs for select
  using ((select auth.uid()) = user_id);

drop policy if exists "Users can create their own discipline logs" on public.discipline_logs;
create policy "Users can create their own discipline logs"
  on public.discipline_logs for insert
  with check (
    (select auth.uid()) = user_id
    and exists (
      select 1 from public.discipline_habits
      where id = habit_id and user_id = (select auth.uid())
    )
  );

drop policy if exists "Users can delete their own discipline logs" on public.discipline_logs;
create policy "Users can delete their own discipline logs"
  on public.discipline_logs for delete
  using ((select auth.uid()) = user_id);

grant select, insert, update, delete on public.discipline_habits to authenticated;
grant select, insert, delete on public.discipline_logs to authenticated;
