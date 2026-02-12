-- Add profile and Stripe columns to service_providers table
-- This migration removes localStorage dependency for provider profile data

-- Add profile-related columns
ALTER TABLE service_providers 
ADD COLUMN IF NOT EXISTS profile_image_url text,
ADD COLUMN IF NOT EXISTS stripe_account_id text,
ADD COLUMN IF NOT EXISTS stripe_account_email text,
ADD COLUMN IF NOT EXISTS stripe_is_connected boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS stripe_connect_enabled boolean DEFAULT false;

-- Add updated_at trigger if not exists
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_service_providers_updated_at 
    BEFORE UPDATE ON service_providers 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Add comments for documentation
COMMENT ON COLUMN service_providers.profile_image_url IS 'URL to provider profile image stored in Supabase storage';
COMMENT ON COLUMN service_providers.stripe_account_id IS 'Stripe Connect account ID for provider';
COMMENT ON COLUMN service_providers.stripe_account_email IS 'Email associated with Stripe account';
COMMENT ON COLUMN service_providers.stripe_is_connected IS 'Whether provider has connected Stripe account';
COMMENT ON COLUMN service_providers.stripe_connect_enabled IS 'Whether provider has enabled Stripe Connect for payments';
