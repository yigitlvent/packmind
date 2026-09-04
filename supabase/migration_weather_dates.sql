-- PackMind weather + dates migration
-- Run this in the Supabase SQL editor after the original schema.
-- Safe to re-run.

alter table public.trips
  add column if not exists start_date date,
  add column if not exists end_date date,
  add column if not exists weather_summary text;

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
  loop
    execute format('alter table public.trips drop constraint %I', constraint_name);
  end loop;
end $$;

alter table public.trips
  add constraint trips_weather_check
  check (weather in ('hot', 'cold', 'rainy', 'mixed', 'mild'));
