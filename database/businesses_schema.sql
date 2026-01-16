-- Businesses table for multi-tenant CRM system
-- This table stores business information with owner relationships

CREATE TABLE IF NOT EXISTS businesses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  address TEXT,
  category TEXT NOT NULL,
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan TEXT NOT NULL DEFAULT 'starter',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_businesses_owner_id ON businesses(owner_id);
CREATE INDEX IF NOT EXISTS idx_businesses_category ON businesses(category);
CREATE INDEX IF NOT EXISTS idx_businesses_plan ON businesses(plan);
CREATE INDEX IF NOT EXISTS idx_businesses_is_active ON businesses(is_active);

-- Enable RLS on businesses table
ALTER TABLE businesses ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Allow users to see their own businesses (no restrictions for visibility)
CREATE POLICY "Users can view their own businesses" ON businesses
  FOR SELECT USING (owner_id = auth.uid());

-- Allow users to insert their own businesses
CREATE POLICY "Users can insert their own businesses" ON businesses
  FOR INSERT WITH CHECK (owner_id = auth.uid());

-- Allow users to update their own businesses
CREATE POLICY "Users can update their own businesses" ON businesses
  FOR UPDATE USING (owner_id = auth.uid());

-- Allow users to delete their own businesses
CREATE POLICY "Users can delete their own businesses" ON businesses
  FOR DELETE USING (owner_id = auth.uid());

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_businesses_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at
CREATE TRIGGER trigger_update_businesses_updated_at
  BEFORE UPDATE ON businesses
  FOR EACH ROW
  EXECUTE FUNCTION update_businesses_updated_at();

-- Comments for documentation
COMMENT ON TABLE businesses IS 'Multi-tenant businesses table with owner relationships';
COMMENT ON COLUMN businesses.id IS 'Primary key - UUID generated automatically';
COMMENT ON COLUMN businesses.name IS 'Business name - required field';
COMMENT ON COLUMN businesses.address IS 'Business address - optional';
COMMENT ON COLUMN businesses.category IS 'Business category - required field';
COMMENT ON COLUMN businesses.owner_id IS 'Foreign key to auth.users table - business owner';
COMMENT ON COLUMN businesses.plan IS 'Subscription plan - default: starter';
COMMENT ON COLUMN businesses.is_active IS 'Whether the business is active - default: true';
COMMENT ON COLUMN businesses.created_at IS 'Timestamp when business was created';
COMMENT ON COLUMN businesses.updated_at IS 'Timestamp when business was last updated';
