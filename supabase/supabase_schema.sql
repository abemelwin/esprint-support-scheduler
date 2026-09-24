-- ============================================================
-- ES Print Support Scheduler â€” Supabase Schema
-- Run this in Supabase â†’ SQL Editor
-- ============================================================

-- 1. branches
create table if not exists public.branches (
  id   text primary key default gen_random_uuid()::text,
  name text not null,
  note text default ''
);

-- 2. staff
create table if not exists public.staff (
  id             text primary key default gen_random_uuid()::text,
  name           text not null,
  role           text not null check (role in ('manager','bsm','senior','junior','trainee')),
  home_branch_id text references public.branches(id) on delete set null,
  hotline        boolean default false
);

-- 3. jobs
create table if not exists public.jobs (
  id          text primary key default gen_random_uuid()::text,
  date        text not null,  -- 'YYYY-MM-DD'
  jt_no       text not null,
  staff_id    text references public.staff(id) on delete set null,
  branch_id   text references public.branches(id) on delete set null,
  customer    text not null default '',
  location    text default '',
  type        text not null check (type in ('installation','onsite','hotline','others','leave','absent')),
  type_other  text default '',
  status      text not null default 'pending' check (status in ('pending','ongoing','success','fail','cancel')),
  status_note text default '',
  created_at  timestamptz default now()
);

-- 4. app_users (linked to Supabase Auth)
create table if not exists public.app_users (
  id         text primary key default gen_random_uuid()::text,
  auth_id    uuid references auth.users(id) on delete cascade,
  name       text not null,
  email      text not null,
  role       text not null default 'branch' check (role in ('admin','branch')),
  branch_ids text[] default '{}'
);

-- ============================================================
-- Row Level Security
-- ============================================================

alter table public.branches  enable row level security;
alter table public.staff     enable row level security;
alter table public.jobs      enable row level security;
alter table public.app_users enable row level security;

-- Helper function: get current user's app role
create or replace function public.my_app_role()
returns text language sql security definer stable as $$
  select role from public.app_users where auth_id = auth.uid() limit 1;
$$;

-- Helper function: get current user's branch_ids
create or replace function public.my_branch_ids()
returns text[] language sql security definer stable as $$
  select branch_ids from public.app_users where auth_id = auth.uid() limit 1;
$$;

-- branches: all authenticated users can read; only admins can write
create policy "branches_select" on public.branches for select to authenticated using (true);
create policy "branches_insert" on public.branches for insert to authenticated with check (public.my_app_role() = 'admin');
create policy "branches_update" on public.branches for update to authenticated using (public.my_app_role() = 'admin');
create policy "branches_delete" on public.branches for delete to authenticated using (public.my_app_role() = 'admin');

-- staff: all authenticated users can read; only admins can write
create policy "staff_select" on public.staff for select to authenticated using (true);
create policy "staff_insert" on public.staff for insert to authenticated with check (public.my_app_role() = 'admin');
create policy "staff_update" on public.staff for update to authenticated using (public.my_app_role() = 'admin');
create policy "staff_delete" on public.staff for delete to authenticated using (public.my_app_role() = 'admin');

-- jobs: admins see all; branch users see only their branch
create policy "jobs_select_admin"  on public.jobs for select to authenticated
  using (public.my_app_role() = 'admin');
create policy "jobs_select_branch" on public.jobs for select to authenticated
  using (public.my_app_role() = 'branch' and branch_id = any(public.my_branch_ids()));
create policy "jobs_insert" on public.jobs for insert to authenticated
  with check (
    public.my_app_role() = 'admin'
    or (public.my_app_role() = 'branch' and branch_id = any(public.my_branch_ids()))
  );
create policy "jobs_update" on public.jobs for update to authenticated
  using (
    public.my_app_role() = 'admin'
    or (public.my_app_role() = 'branch' and branch_id = any(public.my_branch_ids()))
  );
create policy "jobs_delete" on public.jobs for delete to authenticated
  using (
    public.my_app_role() = 'admin'
    or (public.my_app_role() = 'branch' and branch_id = any(public.my_branch_ids()))
  );

-- app_users: only admins can read/write all; users can read their own
create policy "appusers_select_admin" on public.app_users for select to authenticated
  using (public.my_app_role() = 'admin');
create policy "appusers_select_self"  on public.app_users for select to authenticated
  using (auth_id = auth.uid());
create policy "appusers_insert" on public.app_users for insert to authenticated
  with check (public.my_app_role() = 'admin' or auth_id = auth.uid());
create policy "appusers_delete" on public.app_users for delete to authenticated
  using (public.my_app_role() = 'admin');

-- ============================================================
-- Realtime
-- ============================================================
alter publication supabase_realtime add table public.jobs;
alter publication supabase_realtime add table public.staff;
alter publication supabase_realtime add table public.branches;

-- ============================================================
-- Seed: Branches
-- ============================================================
insert into public.branches (id, name, note) values
  ('b1',  'BAC',    'Negros Occidental'),
  ('b2',  'BUK',    'Bukidnon'),
  ('b3',  'BUT',    'Agusan del Norte'),
  ('b4',  'CAB',    'Nueva Ecija'),
  ('b5',  'CAMSUR', 'Camarines Sur'),
  ('b6',  'CAV',    'Cavite'),
  ('b7',  'CDO',    'Misamis Oriental'),
  ('b8',  'CEB',    'Cebu'),
  ('b9',  'DAV',    'Davao del Sur'),
  ('b10', 'GENSAN', 'South Cotabato'),
  ('b11', 'ILO',    'Iloilo'),
  ('b12', 'ISA',    'Isabela'),
  ('b13', 'MAK',    'Metro Manila'),
  ('b14', 'PAG',    'Zamboanga del Sur'),
  ('b15', 'PAL',    'Palawan'),
  ('b16', 'PANG',   'Pangasinan'),
  ('b17', 'RIZ',    'Rizal'),
  ('b18', 'TAC',    'Leyte'),
  ('b19', 'TAG',    'Davao del Norte'),
  ('b20', 'ZAM',    'Zamboanga del Sur')
on conflict (id) do nothing;

-- ============================================================
-- Staff records are managed via the app (👥 Staff modal) and
-- the app_users table. No demo staff are seeded here.
-- ============================================================
