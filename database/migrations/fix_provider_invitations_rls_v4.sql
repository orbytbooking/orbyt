-- Fix provider_invitations RLS policies to allow service role operations
-- This resolves the chicken-and-egg problem where we need to create users but RLS requires authentication

-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Business users can view their provider invitations" ON provider_invitations;
DROP POLICY IF EXISTS "Business users can create provider invitations" ON provider_invitations;
DROP POLICY IF EXISTS "Business users can update their provider invitations" ON provider_invitations;
DROP POLICY IF EXISTS "Business users can delete their provider invitations" ON provider_invitations;
DROP POLICY IF EXISTS "Anyone can accept provider invitation" ON provider_invitations;

-- Create new policies that allow service role bypass
CREATE POLICY "Service role can do everything on provider_invitations"
    ON provider_invitations FOR ALL
    USING (
        -- Allow service role operations (bypass RLS)
        current_setting('request.jwt.claims', true)::jsonb->>'role' = 'service_role' OR
        -- Allow business users for their own invitations
        business_id IN (
            SELECT id FROM businesses WHERE owner_id = auth.uid()
        )
    );

-- Create specific policy for invitation acceptance without authentication
CREATE POLICY "Allow invitation acceptance with valid token"
    ON provider_invitations FOR UPDATE
    USING (
        status = 'pending' AND 
        expires_at > NOW() AND
        invitation_token = current_setting('app.current_invitation_token', true)
    )
    WITH CHECK (
        status = 'accepted' AND
        accepted_at = NOW()
    );

-- Create policy for reading invitations with valid token (for validation)
CREATE POLICY "Allow reading invitations with valid token"
    ON provider_invitations FOR SELECT
    USING (
        status = 'pending' AND 
        expires_at > NOW() AND
        invitation_token = current_setting('app.current_invitation_token', true) AND
        email = current_setting('app.current_invitation_email', true)
    );

-- Revoke anon permissions and use proper policies instead
REVOKE ALL ON provider_invitations FROM anon;
REVOKE ALL ON provider_invitations FROM authenticated;

-- Grant necessary permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON provider_invitations TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON provider_invitations TO service_role;
