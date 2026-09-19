-- ============================================================
-- Remove the HTML-seeded demo staff (ids s1..s151).
-- These were placeholder names from the original HTML mock and
-- are NOT real database records, so they should not appear in
-- the Employee dropdown, Availability panel, or reports.
--
-- Run this in Supabase → SQL Editor.
--
-- NOTE: Any jobs that referenced these staff will have their
-- staff_id set to NULL automatically (the FK is ON DELETE SET NULL).
-- ============================================================

delete from public.staff
where id like 's%'
  and id ~ '^s[0-9]+$';   -- matches s1, s2, … s151 exactly (not real UUIDs)
