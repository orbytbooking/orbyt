-- Fix Provider Invitations RLS Policies
-- This migration drops existing RLS policies and recreates them for the simplified schema

-- Drop existing RLS policies
DROP POLICY IF EXISTS "Business users can view their provider invitations";
DROP POLICY IF EXISTS "Business users can create provider invitations";
DROP POLICY IF EXISTS "Business users can update their provider invitations";
DROP POLICY IF EXISTS "Business users can delete their provider invitations";
DROP POLICY IF EXISTS "Anyone can accept provider invitation";

-- Recreate RLS policies for simplified schema
-- Policy: Business users can see their own invitations
CREATE POLICY "Business users can view their provider invitations"
    ON provider_invitations FOR SELECT
    USING (business_id IN (
        SELECT id FROM businesses WHERE owner_id = auth.uid()
    ));

-- Policy: Business users can insert invitations
CREATE POLICY "Business users can create provider invitations"
    ON provider_invitations FOR INSERT
    WITH CHECK (business_id IN (
        SELECT id FROM businesses WHERE owner_id = auth.uid()
    ));

-- Policy: Business users can update invitations
CREATE POLICY "Business users can update their provider invitations"
    ON provider_invitations FOR UPDATE
    USING (business_id IN (
        SELECT id FROM businesses WHERE owner_id = auth.uid()
    ));

-- Policy: Business users can delete invitations
CREATE POLICY "Business users can delete their provider invitations"
    ON provider_invitations FOR DELETE
    USING (business_id IN (
        SELECT id FROM businesses WHERE owner_id = auth.uid()
    ));

-- Policy: Anyone can accept an invitation with valid token
CREATE POLICY "Anyone can accept provider invitation"
    ON provider_invitations FOR UPDATE
    USING (
        status = 'pending' AND 
        expires_at > NOW() AND
        invitation_token = current_setting('app.current_invitation_token', true)
    );
