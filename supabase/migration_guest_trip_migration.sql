-- PackMind guest → Google trip migration
-- Run this in the Supabase SQL editor.
-- Safe to re-run.
--
-- packing_items have no user_id; they follow trips.trip_id via RLS.
-- user_saved_items are not migrated (guests do not persist a library).

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
