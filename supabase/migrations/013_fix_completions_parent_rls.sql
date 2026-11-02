-- supabase/migrations/013_fix_completions_parent_rls.sql
-- Harden day_habit_completions and day_subitem_completions RLS to ensure habit belongs to auth.uid()

drop policy if exists "day_habit_completions: users can insert own" on day_habit_completions;
create policy "day_habit_completions: users can insert own" on day_habit_completions
  for insert with check (
    auth.uid() = user_id
    and exists (
      select 1 from day_entries de
      where de.id = day_habit_completions.day_entry_id
        and de.user_id = auth.uid()
    )
    and exists (
      select 1 from habits h
      where h.id = day_habit_completions.habit_id
        and h.user_id = auth.uid()
    )
  );

drop policy if exists "day_subitem_completions: users can insert own" on day_subitem_completions;
create policy "day_subitem_completions: users can insert own" on day_subitem_completions
  for insert with check (
    auth.uid() = user_id
    and exists (
      select 1 from day_entries de
      where de.id = day_subitem_completions.day_entry_id
        and de.user_id = auth.uid()
    )
    and exists (
      select 1 from habit_subitems hs
      join habits h on h.id = hs.habit_id
      where hs.id = day_subitem_completions.subitem_id
        and h.user_id = auth.uid()
    )
  );

