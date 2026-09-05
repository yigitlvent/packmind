-- PackMind resolved destination coordinates
-- Run this in the Supabase SQL editor.
-- Safe to re-run.

alter table public.trips
  add column if not exists destination_lat double precision;

alter table public.trips
  add column if not exists destination_lon double precision;
