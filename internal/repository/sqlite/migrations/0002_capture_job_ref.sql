-- 0002_capture_job_ref: the extraction vendor hands back an id we must post again
-- to read a snap that was still running at submit time. Forwards only.

ALTER TABLE captures ADD COLUMN extraction_job_ref TEXT;
