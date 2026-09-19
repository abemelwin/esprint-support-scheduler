-- ============================================================
-- FIX: Live/Realtime job updates required a manual refresh.
--
-- Root causes:
--   1) Supabase Realtime enforces RLS. The jobs SELECT policies
--      only fully covered some roles, so others got no live events.
--   2) my_branch_ids() only read the `branch_ids` column and ignored
--      `main_branch_id` and `view_branch_ids`, so users scoped only
--      via main/view branches couldn't SELECT (or receive realtime
--      events for) their own branch's jobs.
--
-- Run in Supabase → SQL Editor. Safe to re-run.
-- ============================================================

-- 1) my_branch_ids() must return the FULL scope:
--    main_branch_id + branch_ids + view_branch_ids
create or replace function public.my_branch_ids()
returns text[] language sql security definer stable as $$
  select array(
    select distinct x from (
      select main_branch_id as x
        from public.app_users where auth_id = auth.uid()
      union all
      select unnest(coalesce(branch_ids, '{}'))
        from public.app_users where auth_id = auth.uid()
      union all
      select unnest(coalesce(view_branch_ids, '{}'))
        from public.app_users where auth_id = auth.uid()
    ) s
    where x is not null
  );
$$;

-- 2) Rebuild the jobs SELECT policies cleanly.
drop policy if exists "jobs_select_admin"  on public.jobs;
drop policy if exists "jobs_select_branch" on public.jobs;
drop policy if exists "jobs_select"        on public.jobs;

-- Elevated roles see ALL jobs (org-wide overview).
create policy "jobs_select_all_roles" on public.jobs
  for select to authenticated
  using (
    public.my_app_role() in ('admin', 'service_manager', 'service_coordinator')
  );

-- Everyone else sees jobs in the branches they're scoped to.
create policy "jobs_select_scoped" on public.jobs
  for select to authenticated
  using (
    branch_id = any(public.my_branch_ids())
  );
