-- Add 'cancel' to the status check constraint
-- Drop the old constraint and add a new one that includes 'cancel'

ALTER TABLE jobs
  DROP CONSTRAINT IF EXISTS jobs_status_check;

ALTER TABLE jobs
  ADD CONSTRAINT jobs_status_check
  CHECK (status IN ('pending', 'ongoing', 'success', 'fail', 'cancel'));
