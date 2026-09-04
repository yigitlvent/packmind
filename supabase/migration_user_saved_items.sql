-- PackMind saved items library
-- Run this in the Supabase SQL editor.
-- Safe to re-run.

create table if not exists public.user_saved_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now(),
  last_used_at timestamptz not null default now(),
  use_count integer not null default 1,
  constraint user_saved_items_name_not_blank check (char_length(trim(name)) > 0)
);

create unique index if not exists user_saved_items_user_name_lower_idx
  on public.user_saved_items (user_id, lower(trim(name)));

create index if not exists user_saved_items_user_id_last_used_idx
  on public.user_saved_items (user_id, last_used_at desc);

alter table public.user_saved_items enable row level security;

drop policy if exists "saved_items_select_own" on public.user_saved_items;
drop policy if exists "saved_items_insert_own" on public.user_saved_items;
drop policy if exists "saved_items_update_own" on public.user_saved_items;
drop policy if exists "saved_items_delete_own" on public.user_saved_items;

create policy "saved_items_select_own"
  on public.user_saved_items
  for select
  to authenticated
  using (user_id = auth.uid());

create policy "saved_items_insert_own"
  on public.user_saved_items
  for insert
  to authenticated
  with check (user_id = auth.uid());

create policy "saved_items_update_own"
  on public.user_saved_items
  for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "saved_items_delete_own"
  on public.user_saved_items
  for delete
  to authenticated
  using (user_id = auth.uid());
