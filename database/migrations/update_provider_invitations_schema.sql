-- Update Provider Invitations Table - Simplified Schema
-- This migration removes complex fields and keeps only essential ones

-- First, drop the existing table and recreate with simplified structure
DROP TABLE IF EXISTS provider_invitations CASCADE;

-- Create simplified provider invitations table
CREATE TABLE provider_invitations (
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
    expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '7 days'),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes for performance
CREATE INDEX idx_provider_invitations_business_id ON provider_invitations(business_id);
CREATE INDEX idx_provider_invitations_email ON provider_invitations(email);
CREATE INDEX idx_provider_invitations_token ON provider_invitations(invitation_token);
CREATE INDEX idx_provider_invitations_status ON provider_invitations(status);
CREATE INDEX idx_provider_invitations_expires_at ON provider_invitations(expires_at);
CREATE INDEX idx_provider_invitations_provider_type ON provider_invitations(provider_type);

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
