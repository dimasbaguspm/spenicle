-- 0004_capture_model: the rail says who read the document and the model says with what.
-- A draft is only reproducible if both are stored. Forwards only.

ALTER TABLE captures ADD COLUMN extraction_model TEXT;
