-- Add partial unique indexes to enforce only one template per account_id or category_id
-- Applies to ALL templates (active and inactive) where deleted_at IS NULL

-- Unique template per account_id (when account_id is set)
CREATE UNIQUE INDEX idx_budget_templates_unique_account
ON budget_templates (account_id)
WHERE deleted_at IS NULL
  AND account_id IS NOT NULL;

-- Unique template per category_id (when category_id is set)
CREATE UNIQUE INDEX idx_budget_templates_unique_category
ON budget_templates (category_id)
WHERE deleted_at IS NULL
  AND category_id IS NOT NULL;
