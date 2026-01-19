-- Add name column to budget_templates table
ALTER TABLE budget_templates
ADD COLUMN name VARCHAR(100) NOT NULL DEFAULT 'Budget Template';