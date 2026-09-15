-- ============================================================
-- Migration: Registration Approval System
-- Run this in Supabase → SQL Editor
-- ============================================================

-- 1. Add 'is_active' and 'is_approved' columns to app_users
alter table public.app_users
  add column if not exists is_active   boolean default true,
  add column if not exists is_approved boolean default true;

-- 2. pending_registrations — holds self-submitted requests awaiting admin approval
create table if not exists public.pending_registrations (
  id          text primary key default gen_random_uuid()::text,
  name        text not null,
  email       text not null unique,
  password    text not null,           -- plain-text stored temporarily until approval
  role        text not null default 'branch'
                check (role in ('service_manager','branch','employee')),
  branch_ids  text[] default '{}',
  status      text not null default 'pending'
                check (status in ('pending','approved','rejected')),
  note        text default '',         -- admin rejection note
  created_at  timestamptz default now()
);

-- 3. RLS on pending_registrations
alter table public.pending_registrations enable row level security;

-- Anyone (including anon) can insert a registration request
create policy "reg_insert_anon" on public.pending_registrations
  for insert to anon, authenticated with check (true);

-- Only admins can read, update (approve/reject), or delete
create policy "reg_select_admin" on public.pending_registrations
  for select to authenticated using (public.my_app_role() = 'admin');

create policy "reg_update_admin" on public.pending_registrations
  for update to authenticated using (public.my_app_role() = 'admin');

create policy "reg_delete_admin" on public.pending_registrations
  for delete to authenticated using (public.my_app_role() = 'admin');

-- 4. Allow admins to update app_users (role, is_active, branch_ids)
create policy "appusers_update_admin" on public.app_users
  for update to authenticated using (public.my_app_role() = 'admin');

-- 5. Realtime for pending_registrations (admin sees live updates)
alter publication supabase_realtime add table public.pending_registrations;
