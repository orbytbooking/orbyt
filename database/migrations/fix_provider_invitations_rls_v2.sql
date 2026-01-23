-- Fix Provider Invitations RLS Policies - Corrected Version
-- This migration drops existing RLS policies and recreates them for the simplified schema

-- Drop existing RLS policies one by one to avoid syntax issues
DO $$
BEGIN
    -- Drop policies if they exist
    BEGIN
        EXECUTE 'DROP POLICY IF EXISTS "Business users can view their provider invitations"';
    EXCEPTION WHEN OTHERS THEN END;
    BEGIN
        EXECUTE 'DROP POLICY IF EXISTS "Business users can create provider invitations"';
    EXCEPTION WHEN OTHERS THEN END;
    BEGIN
        EXECUTE 'DROP POLICY IF EXISTS "Business users can update their provider invitations"';
    EXCEPTION WHEN OTHERS THEN END;
    BEGIN
        EXECUTE 'DROP POLICY IF EXISTS "Business users can delete their provider invitations"';
    EXCEPTION WHEN OTHERS THEN END;
    BEGIN
        EXECUTE 'DROP POLICY IF EXISTS "Anyone can accept provider invitation"';
    EXCEPTION WHEN OTHERS THEN END;
END $$;

-- Recreate RLS policies for simplified schema
CREATE POLICY "Business users can view their provider invitations"
    ON provider_invitations FOR SELECT
    USING (business_id IN (
        SELECT id FROM businesses WHERE owner_id = auth.uid()
    ));

CREATE POLICY "Business users can create provider invitations"
    ON provider_invitations FOR INSERT
    WITH CHECK (business_id IN (
        SELECT id FROM businesses WHERE owner_id = auth.uid()
    ));

CREATE POLICY "Business users can update their provider invitations"
    ON provider_invitations FOR UPDATE
    USING (business_id IN (
        SELECT id FROM businesses WHERE owner_id = auth.uid()
    ));

CREATE POLICY "Business users can delete their provider invitations"
    ON provider_invitations FOR DELETE
    USING (business_id IN (
        SELECT id FROM businesses WHERE owner_id = auth.uid()
    ));

CREATE POLICY "Anyone can accept provider invitation"
    ON provider_invitations FOR UPDATE
    USING (
        status = 'pending' AND 
        expires_at > NOW() AND
        invitation_token = current_setting('app.current_invitation_token', true)
    );
