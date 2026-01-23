-- Migration: Add foreign key constraint to industry_service_category.industry_id
-- Created: 2026-01-24
-- Description: Alters the existing industry_service_category table to add foreign key constraint

-- Step 1: First, we need to change the column type from TEXT to UUID
-- This assumes your existing industry_id values are valid UUIDs
-- If they are industry names (TEXT), you'll need to update them to UUIDs first

-- Step 2: Add the foreign key constraint
ALTER TABLE industry_service_category
ADD CONSTRAINT industry_service_category_industry_id_fkey 
FOREIGN KEY (industry_id) REFERENCES industries(id) ON DELETE CASCADE;

-- Note: If your industry_id column is currently TEXT type with industry names,
-- you need to first convert them to UUIDs before running this migration.
-- Use the following steps instead:

-- Step A: Add a temporary UUID column
-- ALTER TABLE industry_service_category ADD COLUMN industry_id_temp UUID;

-- Step B: Update the temp column with actual industry UUIDs
-- UPDATE industry_service_category sc
-- SET industry_id_temp = i.id
-- FROM industries i
-- WHERE sc.industry_id = i.name;

-- Step C: Drop the old TEXT column
-- ALTER TABLE industry_service_category DROP COLUMN industry_id;

-- Step D: Rename the temp column
-- ALTER TABLE industry_service_category RENAME COLUMN industry_id_temp TO industry_id;

-- Step E: Set NOT NULL constraint
-- ALTER TABLE industry_service_category ALTER COLUMN industry_id SET NOT NULL;

-- Step F: Add the foreign key constraint
-- ALTER TABLE industry_service_category
-- ADD CONSTRAINT industry_service_category_industry_id_fkey 
-- FOREIGN KEY (industry_id) REFERENCES industries(id) ON DELETE CASCADE;
