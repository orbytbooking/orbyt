-- Add missing RLS policies to provider_invitations table
-- This migration adds the security policies that are missing

-- Enable RLS on the table
ALTER TABLE provider_invitations ENABLE ROW LEVEL SECURITY;

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

-- Grant necessary permissions for anonymous users to read invitations
GRANT SELECT ON provider_invitations TO anon;

-- Grant necessary permissions for authenticated users
GRANT ALL ON provider_invitations TO authenticated;
