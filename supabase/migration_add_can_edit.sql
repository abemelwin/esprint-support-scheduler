-- ============================================================
-- Migration: add 'can_edit' permission flag to app_users
-- and pending_registrations
-- Run this ONCE in Supabase → SQL Editor
-- ============================================================

-- 1. Add can_edit to app_users (default true to preserve existing users)
alter table public.app_users
  add column if not exists can_edit boolean not null default true;

-- 2. Add can_edit to pending_registrations (admin sets this before approving)
alter table public.pending_registrations
  add column if not exists can_edit boolean not null default true;
