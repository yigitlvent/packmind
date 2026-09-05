-- PackMind schema
-- Run this in the Supabase SQL editor, then add the project URL and anon key
-- to .env.local (see .env.example).
--
-- Required dashboard setting (no login UI in the app):
-- Authentication → Providers → Anonymous → Enable
-- Anonymous users receive an auth.uid() used by RLS. There is no signup screen.

create table if not exists public.trips (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  session_id text not null,
  destination text not null,
  duration integer not null check (duration > 0),
  start_date date,
  end_date date,
  trip_type text not null check (trip_type in ('business', 'vacation', 'weekend')),
  weather text not null check (weather in ('hot', 'cold', 'rainy', 'mixed', 'mild')),
  weather_summary text,
  destination_lat double precision,
  destination_lon double precision,
  taking_laptop boolean not null default false,
  gym boolean not null default false,
  swimming boolean not null default false,
  hiking boolean not null default false,
  formal_event boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.packing_items (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips(id) on delete cascade,
  name text not null,
  category text not null,
  is_packed boolean not null default false,
  importance text not null default 'recommended',
  reason text,
  created_at timestamptz not null default now()
);

alter table public.trips
  add column if not exists user_id uuid references auth.users(id) on delete cascade;

alter table public.trips
  alter column user_id set default auth.uid();

alter table public.trips
  add column if not exists start_date date;

alter table public.trips
  add column if not exists end_date date;

alter table public.trips
  add column if not exists weather_summary text;

alter table public.trips
  add column if not exists destination_lat double precision;

alter table public.trips
  add column if not exists destination_lon double precision;

create index if not exists trips_session_id_idx on public.trips (session_id);
create index if not exists trips_user_id_idx on public.trips (user_id);
create index if not exists packing_items_trip_id_idx on public.packing_items (trip_id);

alter table public.trips enable row level security;
alter table public.packing_items enable row level security;

drop policy if exists "packmind_trips_anon_all" on public.trips;
drop policy if exists "packmind_items_anon_all" on public.packing_items;
drop policy if exists "trips_select_own" on public.trips;
drop policy if exists "trips_insert_own" on public.trips;
drop policy if exists "trips_update_own" on public.trips;
drop policy if exists "trips_delete_own" on public.trips;
drop policy if exists "items_select_own" on public.packing_items;
drop policy if exists "items_insert_own" on public.packing_items;
drop policy if exists "items_update_own" on public.packing_items;
drop policy if exists "items_delete_own" on public.packing_items;

create policy "trips_select_own"
  on public.trips
  for select
  to authenticated
  using (user_id = auth.uid());

create policy "trips_insert_own"
  on public.trips
  for insert
  to authenticated
  with check (user_id = auth.uid());

create policy "trips_update_own"
  on public.trips
  for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "trips_delete_own"
  on public.trips
  for delete
  to authenticated
  using (user_id = auth.uid());

create policy "items_select_own"
  on public.packing_items
  for select
  to authenticated
  using (
    exists (
      select 1 from public.trips
      where trips.id = packing_items.trip_id
        and trips.user_id = auth.uid()
    )
  );

create policy "items_insert_own"
  on public.packing_items
  for insert
  to authenticated
  with check (
    exists (
      select 1 from public.trips
      where trips.id = packing_items.trip_id
        and trips.user_id = auth.uid()
    )
  );

create policy "items_update_own"
  on public.packing_items
  for update
  to authenticated
  using (
    exists (
      select 1 from public.trips
      where trips.id = packing_items.trip_id
        and trips.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.trips
      where trips.id = packing_items.trip_id
        and trips.user_id = auth.uid()
    )
  );

create policy "items_delete_own"
  on public.packing_items
  for delete
  to authenticated
  using (
    exists (
      select 1 from public.trips
      where trips.id = packing_items.trip_id
        and trips.user_id = auth.uid()
    )
  );

-- Expand weather values for existing databases created before `mild`.
do $$
declare
  constraint_name text;
begin
  for constraint_name in
    select con.conname
    from pg_constraint con
    join pg_class rel on rel.oid = con.conrelid
    join pg_namespace nsp on nsp.oid = rel.relnamespace
    where nsp.nspname = 'public'
      and rel.relname = 'trips'
      and con.contype = 'c'
      and pg_get_constraintdef(con.oid) ilike '%weather%'
      and pg_get_constraintdef(con.oid) ilike '%hot%'
      and pg_get_constraintdef(con.oid) not ilike '%mild%'
  loop
    execute format('alter table public.trips drop constraint %I', constraint_name);
  end loop;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint con
    join pg_class rel on rel.oid = con.conrelid
    where rel.relname = 'trips'
      and con.conname = 'trips_weather_check'
  ) then
    alter table public.trips
      add constraint trips_weather_check
      check (weather in ('hot', 'cold', 'rainy', 'mixed', 'mild'));
  end if;
end $$;

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

-- Guest → Google trip migration. packing_items follow trip_id; saved items are not moved.
create extension if not exists pgcrypto with schema extensions;

create table if not exists public.guest_migration_intents (
  id uuid primary key default gen_random_uuid(),
  guest_user_id uuid not null references auth.users(id) on delete cascade,
  token_hash text not null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  consumed_at timestamptz,
  consumed_by uuid references auth.users(id)
);

create unique index if not exists guest_migration_intents_token_hash_idx
  on public.guest_migration_intents (token_hash);

create index if not exists guest_migration_intents_guest_user_id_idx
  on public.guest_migration_intents (guest_user_id);

alter table public.guest_migration_intents enable row level security;

revoke all on table public.guest_migration_intents from public, anon, authenticated;

drop function if exists public.create_guest_migration_intent();
drop function if exists public.migrate_guest_trips(text);

create function public.create_guest_migration_intent()
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_is_anonymous boolean;
  v_token text;
  v_hash text;
begin
  if v_uid is null then
    raise exception 'Not authenticated';
  end if;

  select u.is_anonymous into v_is_anonymous
  from auth.users u
  where u.id = v_uid;

  if v_is_anonymous is not true then
    raise exception 'Only guest sessions can start trip migration';
  end if;

  delete from public.guest_migration_intents
  where guest_user_id = v_uid
    and consumed_at is null;

  v_token := encode(extensions.gen_random_bytes(32), 'hex');
  v_hash := encode(
    extensions.digest(convert_to(v_token, 'UTF8'), 'sha256'),
    'hex'
  );

  insert into public.guest_migration_intents (
    guest_user_id,
    token_hash,
    expires_at
  ) values (
    v_uid,
    v_hash,
    now() + interval '20 minutes'
  );

  return v_token;
end;
$$;

create function public.migrate_guest_trips(p_token text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_is_anonymous boolean;
  v_hash text;
  v_intent public.guest_migration_intents%rowtype;
  v_guest_anonymous boolean;
  v_moved integer := 0;
begin
  if v_uid is null then
    raise exception 'Not authenticated';
  end if;

  if p_token is null or char_length(trim(p_token)) < 32 then
    raise exception 'Invalid migration intent';
  end if;

  select u.is_anonymous into v_is_anonymous
  from auth.users u
  where u.id = v_uid;

  if v_is_anonymous is true then
    raise exception 'Sign in with Google to finish moving guest trips';
  end if;

  v_hash := encode(
    extensions.digest(convert_to(trim(p_token), 'UTF8'), 'sha256'),
    'hex'
  );

  select *
  into v_intent
  from public.guest_migration_intents
  where token_hash = v_hash
  for update;

  if not found then
    raise exception 'Invalid migration intent';
  end if;

  if v_intent.consumed_at is not null then
    if v_intent.consumed_by = v_uid then
      return jsonb_build_object(
        'migrated_trips', 0,
        'already_done', true
      );
    end if;
    raise exception 'This migration was already used';
  end if;

  if v_intent.expires_at <= now() then
    raise exception 'Migration expired';
  end if;

  if v_intent.guest_user_id = v_uid then
    raise exception 'Nothing to migrate';
  end if;

  select u.is_anonymous into v_guest_anonymous
  from auth.users u
  where u.id = v_intent.guest_user_id;

  if v_guest_anonymous is not true then
    raise exception 'Source account is not a guest session';
  end if;

  update public.trips
  set user_id = v_uid
  where user_id = v_intent.guest_user_id;

  get diagnostics v_moved = row_count;

  update public.guest_migration_intents
  set consumed_at = now(),
      consumed_by = v_uid
  where id = v_intent.id;

  return jsonb_build_object(
    'migrated_trips', v_moved,
    'already_done', false
  );
end;
$$;

revoke all on function public.create_guest_migration_intent() from public, anon;
revoke all on function public.migrate_guest_trips(text) from public, anon;
grant execute on function public.create_guest_migration_intent() to authenticated;
grant execute on function public.migrate_guest_trips(text) to authenticated;
