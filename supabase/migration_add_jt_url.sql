-- ============================================================
-- Add jt_url column to jobs — stores the NetSuite hyperlink
-- captured when pasting a linked NetSuite# from NetSuite.
-- Run this in Supabase → SQL Editor.
-- ============================================================

alter table public.jobs
  add column if not exists jt_url text default '';
