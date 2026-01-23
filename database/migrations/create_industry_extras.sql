-- Migration: Create industry_extras table
-- Created: 2026-01-24
-- Description: Creates the industry_extras table to store extras/add-ons for industries

CREATE TABLE IF NOT EXISTS industry_extras (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  industry_id UUID NOT NULL REFERENCES industries(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  time_minutes INTEGER DEFAULT 0,
  service_category TEXT,
  price DECIMAL(10, 2) DEFAULT 0,
  display TEXT DEFAULT 'frontend-backend-admin' CHECK (display IN ('frontend-backend-admin', 'backend-admin', 'admin-only')),
  qty_based BOOLEAN DEFAULT false,
  exempt_from_discount BOOLEAN DEFAULT false,
  show_based_on_frequency BOOLEAN DEFAULT false,
  frequency_options TEXT[],
  show_based_on_service_category BOOLEAN DEFAULT false,
  service_category_options TEXT[],
  show_based_on_variables BOOLEAN DEFAULT false,
  variable_options TEXT[],
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_industry_extras_business_id ON industry_extras(business_id);
CREATE INDEX IF NOT EXISTS idx_industry_extras_industry_id ON industry_extras(industry_id);
CREATE INDEX IF NOT EXISTS idx_industry_extras_sort_order ON industry_extras(sort_order);

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_industry_extras_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_industry_extras_updated_at
  BEFORE UPDATE ON industry_extras
  FOR EACH ROW
  EXECUTE FUNCTION update_industry_extras_updated_at();

-- Row Level Security (RLS) Policies
ALTER TABLE industry_extras ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view extras for their business
CREATE POLICY "Users can view their business extras"
  ON industry_extras
  FOR SELECT
  USING (
    business_id IN (
      SELECT id FROM businesses WHERE owner_id = auth.uid()
    )
  );

-- Policy: Users can insert extras for their business
CREATE POLICY "Users can insert extras for their business"
  ON industry_extras
  FOR INSERT
  WITH CHECK (
    business_id IN (
      SELECT id FROM businesses WHERE owner_id = auth.uid()
    )
  );

-- Policy: Users can update extras for their business
CREATE POLICY "Users can update their business extras"
  ON industry_extras
  FOR UPDATE
  USING (
    business_id IN (
      SELECT id FROM businesses WHERE owner_id = auth.uid()
    )
  );

-- Policy: Users can delete extras for their business
CREATE POLICY "Users can delete their business extras"
  ON industry_extras
  FOR DELETE
  USING (
    business_id IN (
      SELECT id FROM businesses WHERE owner_id = auth.uid()
    )
  );
