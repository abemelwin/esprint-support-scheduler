-- ============================================================
-- Migration: add 'employee' role support
-- Run this ONCE in Supabase → SQL Editor
-- ============================================================

-- 1. Update the CHECK constraint on app_users.role to allow 'employee'
alter table public.app_users
  drop constraint if exists app_users_role_check;

alter table public.app_users
  add constraint app_users_role_check
  check (role in ('admin', 'service_manager', 'employee', 'branch'));

-- 2. Update the CHECK constraint on pending_registrations.role to allow 'employee'
--    (only needed if the pending_registrations table was created without 'employee')
alter table public.pending_registrations
  drop constraint if exists pending_registrations_role_check;

alter table public.pending_registrations
  add constraint pending_registrations_role_check
  check (role in ('service_manager', 'employee', 'branch'));

-- 3. Jobs RLS — employee role is read-only scoped to their branch_ids
--    (employees should not insert/update/delete jobs)
--    The existing jobs_select_branch policy already covers them via my_branch_ids(),
--    but we need to add 'employee' to the select policy.

drop policy if exists "jobs_select_branch" on public.jobs;

create policy "jobs_select_branch" on public.jobs for select to authenticated
  using (
    public.my_app_role() in ('branch', 'service_manager', 'employee')
    and branch_id = any(public.my_branch_ids())
  );

-- employees cannot insert/update/delete jobs — existing policies already exclude them
-- (they only allow 'admin', 'branch', 'service_manager')
