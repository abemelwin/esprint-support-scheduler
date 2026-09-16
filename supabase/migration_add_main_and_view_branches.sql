-- ============================================================
-- Migration: Add main_branch_id and view_branch_ids
-- to app_users and pending_registrations
-- Run this ONCE in Supabase -> SQL Editor
-- ============================================================

-- 1. Add main_branch_id (primary editable branch)
alter table public.app_users
  add column if not exists main_branch_id text,
  add column if not exists view_branch_ids text[] default '{}';

-- 2. Add to pending_registrations for approval workflow
alter table public.pending_registrations
  add column if not exists main_branch_id text,
  add column if not exists view_branch_ids text[] default '{}';
