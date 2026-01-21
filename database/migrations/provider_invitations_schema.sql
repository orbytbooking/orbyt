-- Provider Invitations Table
CREATE TABLE IF NOT EXISTS provider_invitations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    phone VARCHAR(20),
    address TEXT,
    provider_type VARCHAR(20) DEFAULT 'individual' CHECK (provider_type IN ('individual', 'team')),
    invitation_token VARCHAR(255) UNIQUE NOT NULL,
    temp_password VARCHAR(255),
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired', 'cancelled')),
    invited_by UUID REFERENCES auth.users(id),
    invited_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    accepted_at TIMESTAMP WITH TIME ZONE,
    expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '30 days'),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_provider_invitations_business_id ON provider_invitations(business_id);
CREATE INDEX IF NOT EXISTS idx_provider_invitations_email ON provider_invitations(email);
CREATE INDEX IF NOT EXISTS idx_provider_invitations_token ON provider_invitations(invitation_token);
CREATE INDEX IF NOT EXISTS idx_provider_invitations_status ON provider_invitations(status);
CREATE INDEX IF NOT EXISTS idx_provider_invitations_expires_at ON provider_invitations(expires_at);
CREATE INDEX IF NOT EXISTS idx_provider_invitations_provider_type ON provider_invitations(provider_type);

-- Add RLS policies
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

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_provider_invitations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at
CREATE TRIGGER update_provider_invitations_updated_at_trigger
    BEFORE UPDATE ON provider_invitations
    FOR EACH ROW
    EXECUTE FUNCTION update_provider_invitations_updated_at();

-- Function to clean up expired invitations
CREATE OR REPLACE FUNCTION cleanup_expired_invitations()
RETURNS void AS $$
BEGIN
    UPDATE provider_invitations 
    SET status = 'expired'
    WHERE status = 'pending' AND expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- Create a function to check if an invitation is valid
CREATE OR REPLACE FUNCTION is_invitation_valid(p_token VARCHAR(255), p_email VARCHAR(255))
RETURNS BOOLEAN AS $$
DECLARE
    invitation_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO invitation_count
    FROM provider_invitations
    WHERE invitation_token = p_token 
      AND email = p_email 
      AND status = 'pending' 
      AND expires_at > NOW();
    
    RETURN invitation_count > 0;
END;
$$ LANGUAGE plpgsql;

-- Grant necessary permissions
GRANT ALL ON provider_invitations TO authenticated;
GRANT SELECT ON provider_invitations TO anon;
