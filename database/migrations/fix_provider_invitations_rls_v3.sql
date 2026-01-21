-- Add policy to allow anyone to read invitation with valid token
-- This is needed for the invite page to work without authentication

-- Policy: Anyone can read an invitation with valid token and email
CREATE POLICY "Anyone can read provider invitation with valid token"
    ON provider_invitations FOR SELECT
    USING (
        invitation_token = current_setting('app.current_invitation_token', true) AND
        email = current_setting('app.current_invitation_email', true) AND
        status = 'pending' AND
        expires_at > NOW()
    );

-- Grant necessary permissions for anon users
GRANT SELECT ON provider_invitations TO anon;
