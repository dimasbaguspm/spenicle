-- 0003_export_window: an export may be limited to a date range.
-- Keep comments free of semicolons: the splitter is naive on purpose.

ALTER TABLE exports ADD COLUMN from_on TEXT;

ALTER TABLE exports ADD COLUMN to_on TEXT;
