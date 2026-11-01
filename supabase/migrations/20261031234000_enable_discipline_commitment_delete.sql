drop policy if exists "Users can delete their own discipline habits" on public.discipline_habits;
create policy "Users can delete their own discipline habits"
  on public.discipline_habits for delete
  using ((select auth.uid()) = user_id);

grant delete on public.discipline_habits to authenticated;
