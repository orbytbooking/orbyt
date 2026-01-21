-- Fix service_providers table to allow provider creation without auth.user
-- Remove the foreign key constraint that requires auth.users to exist first

-- Drop the problematic foreign key constraint
ALTER TABLE service_providers DROP CONSTRAINT IF EXISTS service_providers_user_id_fkey;

-- Make user_id nullable to allow provider creation without auth user
ALTER TABLE service_providers ALTER COLUMN user_id DROP NOT NULL;

-- Add a new constraint that allows NULL user_id for providers created via invitation
ALTER TABLE service_providers ADD CONSTRAINT service_providers_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL;

-- Add comment explaining the change
COMMENT ON COLUMN service_providers.user_id IS 'Can be NULL for providers created via invitation before auth account is set up';
