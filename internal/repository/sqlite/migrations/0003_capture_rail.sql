-- 0003_capture_rail: every draft says which extraction rail produced it, so a capture
-- is never anonymous about its vendor. Forwards only.

ALTER TABLE captures ADD COLUMN extraction_rail TEXT;
