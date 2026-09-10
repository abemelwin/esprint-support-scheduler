-- ============================================================
-- Migration: allow 'leave' and 'absent' job types
-- Run this ONCE in Supabase → SQL Editor
-- ============================================================

-- Drop the old CHECK constraint on jobs.type, then re-create it
-- with the two new absence types included.
alter table public.jobs
  drop constraint if exists jobs_type_check;

alter table public.jobs
  add constraint jobs_type_check
  check (type in ('installation','onsite','hotline','others','leave','absent'));
