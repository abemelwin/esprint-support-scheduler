-- ============================================================
-- Migration: Add Support for Junior FSE, Senior FSE, Trainee,
-- Service Coordinator, and Employee roles to app_users and pending_registrations
-- Run this in Supabase -> SQL Editor
-- ============================================================

-- 1. Update the CHECK constraint on app_users.role
alter table public.app_users
  drop constraint if exists app_users_role_check;

alter table public.app_users
  add constraint app_users_role_check
  check (role in (
    'admin',
    'service_manager',
    'service_coordinator',
    'senior_fse',
    'junior_fse',
    'field_service_engineer',
    'trainee',
    'employee',
    'branch'
  ));

-- 2. Update the CHECK constraint on pending_registrations.role
alter table public.pending_registrations
  drop constraint if exists pending_registrations_role_check;

alter table public.pending_registrations
  add constraint pending_registrations_role_check
  check (role in (
    'admin',
    'service_manager',
    'service_coordinator',
    'senior_fse',
    'junior_fse',
    'field_service_engineer',
    'trainee',
    'employee',
    'branch'
  ));

-- 3. Jobs RLS policies to allow new roles with branch access
drop policy if exists "jobs_select_branch" on public.jobs;
drop policy if exists "jobs_insert" on public.jobs;
drop policy if exists "jobs_update" on public.jobs;
drop policy if exists "jobs_delete" on public.jobs;

create policy "jobs_select_branch" on public.jobs for select to authenticated
  using (
    public.my_app_role() in ('branch', 'service_manager', 'service_coordinator', 'senior_fse', 'junior_fse', 'field_service_engineer', 'trainee', 'employee')
    and branch_id = any(public.my_branch_ids())
  );

create policy "jobs_insert" on public.jobs for insert to authenticated
  with check (
    public.my_app_role() = 'admin'
    or (
      public.my_app_role() in ('branch', 'service_manager', 'service_coordinator', 'senior_fse', 'junior_fse', 'field_service_engineer', 'trainee')
      and branch_id = any(public.my_branch_ids())
    )
  );

create policy "jobs_update" on public.jobs for update to authenticated
  using (
    public.my_app_role() = 'admin'
    or (
      public.my_app_role() in ('branch', 'service_manager', 'service_coordinator', 'senior_fse', 'junior_fse', 'field_service_engineer', 'trainee')
      and branch_id = any(public.my_branch_ids())
    )
  );

create policy "jobs_delete" on public.jobs for delete to authenticated
  using (
    public.my_app_role() = 'admin'
    or (
      public.my_app_role() in ('branch', 'service_manager', 'service_coordinator', 'senior_fse', 'junior_fse', 'field_service_engineer', 'trainee')
      and branch_id = any(public.my_branch_ids())
    )
  );
