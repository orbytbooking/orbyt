-- Providers table for multi-tenant CRM system
-- This table stores provider information linked to businesses

-- Drop existing table completely to avoid any conflicts
DROP TABLE IF EXISTS providers CASCADE;

-- Create with fresh name to avoid any caching issues
CREATE TABLE service_providers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  address TEXT,
  specialization TEXT DEFAULT 'General Services',
  rating DECIMAL(3,2) DEFAULT 0.0,
  completed_jobs INTEGER DEFAULT 0,
  status TEXT DEFAULT 'active',
  provider_type TEXT DEFAULT 'individual',
  send_email_notification BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_service_providers_user_id ON service_providers(user_id);
CREATE INDEX IF NOT EXISTS idx_service_providers_business_id ON service_providers(business_id);
CREATE INDEX IF NOT EXISTS idx_service_providers_status ON service_providers(status);
CREATE INDEX IF NOT EXISTS idx_service_providers_specialization ON service_providers(specialization);

-- Enable RLS on service_providers table
ALTER TABLE service_providers ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Allow business owners to view providers for their businesses
CREATE POLICY "Business owners can view their providers" ON service_providers
  FOR SELECT USING (
    business_id IN (
      SELECT id FROM businesses 
      WHERE owner_id = auth.uid()
    )
  );

-- Allow business owners to insert providers for their businesses
CREATE POLICY "Business owners can insert providers for their businesses" ON service_providers
  FOR INSERT WITH CHECK (
    business_id IN (
      SELECT id FROM businesses 
      WHERE owner_id = auth.uid()
    )
  );

-- Allow business owners to update providers for their businesses
CREATE POLICY "Business owners can update providers for their businesses" ON service_providers
  FOR UPDATE USING (
    business_id IN (
      SELECT id FROM businesses 
      WHERE owner_id = auth.uid()
    )
  );

-- Allow business owners to delete providers for their businesses
CREATE POLICY "Business owners can delete providers for their businesses" ON service_providers
  FOR DELETE USING (
    business_id IN (
      SELECT id FROM businesses 
      WHERE owner_id = auth.uid()
    )
  );

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_service_providers_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at
CREATE TRIGGER trigger_update_service_providers_updated_at
  BEFORE UPDATE ON service_providers
  FOR EACH ROW
  EXECUTE FUNCTION update_service_providers_updated_at();

-- Comments for documentation
COMMENT ON TABLE service_providers IS 'Multi-tenant providers table with business relationships';
COMMENT ON COLUMN service_providers.id IS 'Primary key - UUID generated automatically';
COMMENT ON COLUMN service_providers.user_id IS 'Foreign key to auth.users table - provider account';
COMMENT ON COLUMN service_providers.business_id IS 'Foreign key to businesses table - business association';
COMMENT ON COLUMN service_providers.first_name IS 'Provider first name - required field';
COMMENT ON COLUMN service_providers.last_name IS 'Provider last name - required field';
COMMENT ON COLUMN service_providers.email IS 'Provider email - required field';
COMMENT ON COLUMN service_providers.phone IS 'Provider phone number - optional';
COMMENT ON COLUMN service_providers.address IS 'Provider address - optional';
COMMENT ON COLUMN service_providers.specialization IS 'Provider specialization - default: General Services';
COMMENT ON COLUMN service_providers.rating IS 'Provider rating (0-5) - default: 0.0';
COMMENT ON COLUMN service_providers.completed_jobs IS 'Number of completed jobs - default: 0';
COMMENT ON COLUMN service_providers.status IS 'Provider status - default: active';
COMMENT ON COLUMN service_providers.provider_type IS 'Provider type - default: individual';
COMMENT ON COLUMN service_providers.send_email_notification IS 'Whether to send email notifications - default: false';
COMMENT ON COLUMN service_providers.created_at IS 'Timestamp when provider was created';
COMMENT ON COLUMN service_providers.updated_at IS 'Timestamp when provider was last updated';
