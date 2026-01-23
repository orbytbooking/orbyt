-- Migration: Fix RLS policies for service_providers table
-- This migration updates the RLS policies to work with service role key operations

-- Drop existing RLS policies
DROP POLICY IF EXISTS "Business owners can view their providers" ON service_providers;
DROP POLICY IF EXISTS "Business owners can insert providers for their businesses" ON service_providers;
DROP POLICY IF EXISTS "Business owners can update providers for their businesses" ON service_providers;
DROP POLICY IF EXISTS "Business owners can delete providers for their businesses" ON service_providers;

-- Create new RLS policies that work with both authenticated users and service role key
-- Allow business owners to view providers for their businesses
CREATE POLICY "Business owners can view their providers" ON service_providers
  FOR SELECT USING (
    -- Allow service role key (bypass RLS) or authenticated business owners
    (current_setting('request.jwt.claims', true)::jsonb->>'role' = 'service_role') OR
    (business_id IN (
      SELECT id FROM businesses 
      WHERE owner_id = auth.uid()
    ))
  );

-- Allow business owners to insert providers for their businesses
CREATE POLICY "Business owners can insert providers for their businesses" ON service_providers
  FOR INSERT WITH CHECK (
    -- Allow service role key (bypass RLS) or authenticated business owners
    (current_setting('request.jwt.claims', true)::jsonb->>'role' = 'service_role') OR
    (business_id IN (
      SELECT id FROM businesses 
      WHERE owner_id = auth.uid()
    ))
  );

-- Allow business owners to update providers for their businesses
CREATE POLICY "Business owners can update providers for their businesses" ON service_providers
  FOR UPDATE USING (
    -- Allow service role key (bypass RLS) or authenticated business owners
    (current_setting('request.jwt.claims', true)::jsonb->>'role' = 'service_role') OR
    (business_id IN (
      SELECT id FROM businesses 
      WHERE owner_id = auth.uid()
    ))
  );

-- Allow business owners to delete providers for their businesses
CREATE POLICY "Business owners can delete providers for their businesses" ON service_providers
  FOR DELETE USING (
    -- Allow service role key (bypass RLS) or authenticated business owners
    (current_setting('request.jwt.claims', true)::jsonb->>'role' = 'service_role') OR
    (business_id IN (
      SELECT id FROM businesses 
      WHERE owner_id = auth.uid()
    ))
  );

-- Alternative simpler approach: Allow service role key to bypass RLS completely
-- Create a separate policy for service role operations
CREATE POLICY "Service role can manage all providers" ON service_providers
  FOR ALL USING (
    current_setting('request.jwt.claims', true)::jsonb->>'role' = 'service_role'
  ) WITH CHECK (
    current_setting('request.jwt.claims', true)::jsonb->>'role' = 'service_role'
  );

-- Log the migration completion
DO $$
BEGIN
    RAISE NOTICE 'Migration completed: Fixed RLS policies for service_providers table';
END $$;
