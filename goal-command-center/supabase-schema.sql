create table if not exists public.goal_app_state (
  user_id uuid primary key references auth.users(id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.goal_app_state enable row level security;

grant select, insert, update on public.goal_app_state to authenticated;

drop policy if exists "Users can read their own goal state" on public.goal_app_state;
drop policy if exists "Users can insert their own goal state" on public.goal_app_state;
drop policy if exists "Users can update their own goal state" on public.goal_app_state;

create policy "Users can read their own goal state"
on public.goal_app_state for select
to authenticated
using (auth.uid() = user_id);

create policy "Users can insert their own goal state"
on public.goal_app_state for insert
to authenticated
with check (auth.uid() = user_id);

create policy "Users can update their own goal state"
on public.goal_app_state for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);
