-- Create tenant_users table for team member management
-- This table allows multiple users to work for the same business

CREATE TABLE IF NOT EXISTS tenant_users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member', 'viewer')),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Ensure a user can only have one role per business
  UNIQUE(user_id, business_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_tenant_users_user_id ON tenant_users(user_id);
CREATE INDEX IF NOT EXISTS idx_tenant_users_business_id ON tenant_users(business_id);
CREATE INDEX IF NOT EXISTS idx_tenant_users_active ON tenant_users(is_active);

-- Enable RLS
ALTER TABLE tenant_users ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Business users can view their own tenant_users" ON tenant_users;
CREATE POLICY "Business users can view their own tenant_users" ON tenant_users
  FOR SELECT USING (business_id IN (SELECT id FROM businesses WHERE owner_id = auth.uid()));

DROP POLICY IF EXISTS "Business users can insert their own tenant_users" ON tenant_users;
CREATE POLICY "Business users can insert their own tenant_users" ON tenant_users
  FOR INSERT WITH CHECK (business_id IN (SELECT id FROM businesses WHERE owner_id = auth.uid()));

DROP POLICY IF EXISTS "Business users can update their own tenant_users" ON tenant_users;
CREATE POLICY "Business users can update their own tenant_users" ON tenant_users
  FOR UPDATE USING (business_id IN (SELECT id FROM businesses WHERE owner_id = auth.uid()));

DROP POLICY IF EXISTS "Business users can delete their own tenant_users" ON tenant_users;
CREATE POLICY "Business users can delete their own tenant_users" ON tenant_users
  FOR DELETE USING (business_id IN (SELECT id FROM businesses WHERE owner_id = auth.uid()));

-- Function to automatically update updated_at
CREATE OR REPLACE FUNCTION update_tenant_users_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for updated_at
DROP TRIGGER IF EXISTS trigger_update_tenant_users_updated_at ON tenant_users;
CREATE TRIGGER trigger_update_tenant_users_updated_at
  BEFORE UPDATE ON tenant_users
  FOR EACH ROW
  EXECUTE FUNCTION update_tenant_users_updated_at();

-- Auto-add business owner as tenant_user when business is created
CREATE OR REPLACE FUNCTION add_owner_as_tenant_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Add the business owner as an admin tenant_user
  INSERT INTO tenant_users (user_id, business_id, role, is_active)
  VALUES (NEW.owner_id, NEW.id, 'owner', true)
  ON CONFLICT (user_id, business_id) DO NOTHING;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-add owner as tenant_user
DROP TRIGGER IF EXISTS trigger_add_owner_as_tenant_user ON businesses;
CREATE TRIGGER trigger_add_owner_as_tenant_user
  AFTER INSERT ON businesses
  FOR EACH ROW
  EXECUTE FUNCTION add_owner_as_tenant_user();

-- Comments
COMMENT ON TABLE tenant_users IS 'Team member management - allows multiple users per business';
COMMENT ON COLUMN tenant_users.user_id IS 'Reference to auth.users table';
COMMENT ON COLUMN tenant_users.business_id IS 'Reference to businesses table';
COMMENT ON COLUMN tenant_users.role IS 'User role within the business (owner, admin, member, viewer)';
COMMENT ON COLUMN tenant_users.is_active IS 'Whether this team member is active';
