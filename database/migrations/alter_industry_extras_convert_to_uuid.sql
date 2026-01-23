-- Migration: Convert industry_id from TEXT to UUID with foreign key
-- Created: 2026-01-24
-- Description: Converts industry_id column to UUID and adds foreign key constraint for industry_extras table

-- IMPORTANT: Run this migration carefully. Back up your data first!

BEGIN;

-- Step 1: Add a temporary UUID column
ALTER TABLE industry_extras 
ADD COLUMN industry_id_new UUID;

-- Step 2: Update the new column with actual industry UUIDs
-- This maps the TEXT industry_id (industry name) to the UUID from industries table
UPDATE industry_extras ie
SET industry_id_new = i.id
FROM industries i
WHERE ie.industry_id = i.name;

-- Step 3: Check if any rows failed to map (optional but recommended)
-- SELECT COUNT(*) FROM industry_extras WHERE industry_id_new IS NULL;
-- If count > 0, you have orphaned records that need manual fixing

-- Step 4: Drop the old TEXT column
ALTER TABLE industry_extras 
DROP COLUMN industry_id;

-- Step 5: Rename the new column to industry_id
ALTER TABLE industry_extras 
RENAME COLUMN industry_id_new TO industry_id;

-- Step 6: Set NOT NULL constraint
ALTER TABLE industry_extras 
ALTER COLUMN industry_id SET NOT NULL;

-- Step 7: Add the foreign key constraint
ALTER TABLE industry_extras
ADD CONSTRAINT industry_extras_industry_id_fkey 
FOREIGN KEY (industry_id) REFERENCES industries(id) ON DELETE CASCADE;

-- Step 8: Recreate the index (it was dropped with the old column)
CREATE INDEX IF NOT EXISTS idx_industry_extras_industry_id 
ON industry_extras(industry_id);

COMMIT;

-- If anything fails, the transaction will rollback and no changes will be made
