-- ============================================================
-- Enable Supabase Realtime for all tables the app subscribes to.
-- This is what makes the Overview / Schedule update LIVE the
-- moment anyone sets or changes a job schedule.
--
-- Run this in Supabase → SQL Editor. Safe to re-run.
-- ============================================================

-- Ensure the tables emit full row data on UPDATE/DELETE events
-- (so the client receives complete changed rows, not just PKs).
alter table public.jobs      replica identity full;
alter table public.staff     replica identity full;
alter table public.branches  replica identity full;
alter table public.app_users replica identity full;

-- Add each table to the realtime publication if not already present.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'jobs'
  ) then execute 'alter publication supabase_realtime add table public.jobs'; end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'staff'
  ) then execute 'alter publication supabase_realtime add table public.staff'; end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'branches'
  ) then execute 'alter publication supabase_realtime add table public.branches'; end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'app_users'
  ) then execute 'alter publication supabase_realtime add table public.app_users'; end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'pending_registrations'
  ) then execute 'alter publication supabase_realtime add table public.pending_registrations'; end if;
end $$;
