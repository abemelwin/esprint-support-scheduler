-- ============================================================
-- Migration: add 'service_manager' role support
-- Run this ONCE in Supabase → SQL Editor
-- ============================================================

-- 1. Update the CHECK constraint on app_users.role to allow 'service_manager'
alter table public.app_users
  drop constraint if exists app_users_role_check;

alter table public.app_users
  add constraint app_users_role_check
  check (role in ('admin', 'service_manager', 'branch'));

-- 2. Update RLS policies on jobs to include service_manager
--    (same access as branch — scoped to their assigned branch_ids)

drop policy if exists "jobs_insert" on public.jobs;
drop policy if exists "jobs_update" on public.jobs;
drop policy if exists "jobs_delete" on public.jobs;
drop policy if exists "jobs_select_branch" on public.jobs;

create policy "jobs_select_branch" on public.jobs for select to authenticated
  using (
    public.my_app_role() in ('branch', 'service_manager')
    and branch_id = any(public.my_branch_ids())
  );

create policy "jobs_insert" on public.jobs for insert to authenticated
  with check (
    public.my_app_role() = 'admin'
    or (public.my_app_role() in ('branch', 'service_manager') and branch_id = any(public.my_branch_ids()))
  );

create policy "jobs_update" on public.jobs for update to authenticated
  using (
    public.my_app_role() = 'admin'
    or (public.my_app_role() in ('branch', 'service_manager') and branch_id = any(public.my_branch_ids()))
  );

create policy "jobs_delete" on public.jobs for delete to authenticated
  using (
    public.my_app_role() = 'admin'
    or (public.my_app_role() in ('branch', 'service_manager') and branch_id = any(public.my_branch_ids()))
  );

-- 3. Allow service_managers to also select from app_users (same as admin)
--    so they can see user lists if needed
-- (optional — remove if not needed)
drop policy if exists "appusers_select_admin" on public.app_users;

create policy "appusers_select_admin" on public.app_users for select to authenticated
  using (public.my_app_role() in ('admin', 'service_manager'));
