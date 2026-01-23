-- Services table for multi-tenant CRM system
-- Each business has its own service catalog

CREATE TABLE IF NOT EXISTS services (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  base_price NUMERIC(10,2) NOT NULL DEFAULT 0,
  duration_hours INTEGER NOT NULL DEFAULT 1,
  service_type TEXT NOT NULL DEFAULT 'service',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Unique service name per business
  UNIQUE(business_id, name)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_services_business_id ON services(business_id);
CREATE INDEX IF NOT EXISTS idx_services_active ON services(is_active);
CREATE INDEX IF NOT EXISTS idx_services_type ON services(service_type);

-- Enable RLS
ALTER TABLE services ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist, then create new ones
DO $$
BEGIN
  DROP POLICY IF EXISTS "Business users can view their own services" ON services;
  DROP POLICY IF EXISTS "Business users can insert their own services" ON services;
  DROP POLICY IF EXISTS "Business users can update their own services" ON services;
  DROP POLICY IF EXISTS "Business users can delete their own services" ON services;
  
  CREATE POLICY "Business users can view their own services" ON services
    FOR SELECT USING (business_id IN (SELECT id FROM businesses WHERE owner_id = auth.uid()));

  CREATE POLICY "Business users can insert their own services" ON services
    FOR INSERT WITH CHECK (business_id IN (SELECT id FROM businesses WHERE owner_id = auth.uid()));

  CREATE POLICY "Business users can update their own services" ON services
    FOR UPDATE USING (business_id IN (SELECT id FROM businesses WHERE owner_id = auth.uid()));

  CREATE POLICY "Business users can delete their own services" ON services
    FOR DELETE USING (business_id IN (SELECT id FROM businesses WHERE owner_id = auth.uid()));
END $$;

-- Function to automatically update updated_at
CREATE OR REPLACE FUNCTION update_services_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if it exists, then create new one
DROP TRIGGER IF EXISTS trigger_update_services_updated_at ON services;
CREATE TRIGGER trigger_update_services_updated_at
  BEFORE UPDATE ON services
  FOR EACH ROW
  EXECUTE FUNCTION update_services_updated_at();

-- Comments
COMMENT ON TABLE services IS 'Services table with proper business isolation - each business has its own catalog';
COMMENT ON COLUMN services.business_id IS 'Required for multi-tenant isolation - services belong to specific businesses';
