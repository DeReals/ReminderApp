create table if not exists public.task_subtasks (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null check (char_length(btrim(title)) between 1 and 120),
  due_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists task_subtasks_task_id_created_at_idx
  on public.task_subtasks (task_id, created_at);

alter table public.task_subtasks enable row level security;

drop policy if exists "Users can view their own task subtasks" on public.task_subtasks;
create policy "Users can view their own task subtasks"
  on public.task_subtasks for select
  using ((select auth.uid()) = user_id);

drop policy if exists "Users can create their own task subtasks" on public.task_subtasks;
create policy "Users can create their own task subtasks"
  on public.task_subtasks for insert
  with check (
    (select auth.uid()) = user_id
    and exists (
      select 1 from public.tasks
      where tasks.id = task_id and tasks.user_id = (select auth.uid())
    )
  );

drop policy if exists "Users can update their own task subtasks" on public.task_subtasks;
create policy "Users can update their own task subtasks"
  on public.task_subtasks for update
  using ((select auth.uid()) = user_id)
  with check (
    (select auth.uid()) = user_id
    and exists (
      select 1 from public.tasks
      where tasks.id = task_id and tasks.user_id = (select auth.uid())
    )
  );

drop policy if exists "Users can delete their own task subtasks" on public.task_subtasks;
create policy "Users can delete their own task subtasks"
  on public.task_subtasks for delete
  using ((select auth.uid()) = user_id);

grant select, insert, update, delete on public.task_subtasks to authenticated;
