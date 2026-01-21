-- Fix RLS policies for service_providers to allow service role operations
-- This resolves the "Cannot create record without authenticated user" error

-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Business owners can view their providers" ON service_providers;
DROP POLICY IF EXISTS "Business owners can insert providers for their businesses" ON service_providers;
DROP POLICY IF EXISTS "Business owners can update providers for their businesses" ON service_providers;
DROP POLICY IF EXISTS "Business owners can delete providers for their businesses" ON service_providers;

-- Create new policies that allow service role bypass
CREATE POLICY "Service role can do everything on service_providers"
    ON service_providers FOR ALL
    USING (
        -- Allow service role operations (bypass RLS)
        current_setting('request.jwt.claims', true)::jsonb->>'role' = 'service_role' OR
        -- Allow business users for their own providers
        business_id IN (
            SELECT id FROM businesses WHERE owner_id = auth.uid()
        )
    );

-- Create specific policy for invitation acceptance without authentication
CREATE POLICY "Allow provider creation via invitation"
    ON service_providers FOR INSERT
    WITH CHECK (
        -- Allow service role operations
        current_setting('request.jwt.claims', true)::jsonb->>'role' = 'service_role' OR
        -- Allow creation with NULL user_id for invitation-based providers
        user_id IS NULL
    );

-- Grant necessary permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON service_providers TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON service_providers TO service_role;
