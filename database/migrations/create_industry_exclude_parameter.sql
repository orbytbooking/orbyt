-- Migration: Create industry_exclude_parameter table
-- Created: 2026-01-24
-- Description: Creates the industry_exclude_parameter table to store exclude parameters for industries

CREATE TABLE IF NOT EXISTS industry_exclude_parameter (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  industry_id UUID NOT NULL REFERENCES industries(id) ON DELETE CASCADE,
  
  -- Basic information
  name TEXT NOT NULL,
  description TEXT,
  
  -- Pricing and time
  price DECIMAL(10, 2) DEFAULT 0,
  time_minutes INTEGER DEFAULT 0,
  
  -- Display settings
  display TEXT DEFAULT 'Customer Frontend, Backend & Admin' CHECK (display IN ('Customer Frontend, Backend & Admin', 'Customer Backend & Admin', 'Admin Only')),
  
  -- Service category and frequency filters
  service_category TEXT,
  frequency TEXT,
  
  -- Conditional display flags
  show_based_on_frequency BOOLEAN DEFAULT false,
  show_based_on_service_category BOOLEAN DEFAULT false,
  
  -- Sort order
  sort_order INTEGER DEFAULT 0,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_industry_exclude_parameter_business_id ON industry_exclude_parameter(business_id);
CREATE INDEX IF NOT EXISTS idx_industry_exclude_parameter_industry_id ON industry_exclude_parameter(industry_id);
CREATE INDEX IF NOT EXISTS idx_industry_exclude_parameter_sort_order ON industry_exclude_parameter(sort_order);

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_industry_exclude_parameter_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_industry_exclude_parameter_updated_at
  BEFORE UPDATE ON industry_exclude_parameter
  FOR EACH ROW
  EXECUTE FUNCTION update_industry_exclude_parameter_updated_at();

-- Row Level Security (RLS) Policies
ALTER TABLE industry_exclude_parameter ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view exclude parameters for their business
CREATE POLICY "Users can view their business exclude parameters"
  ON industry_exclude_parameter
  FOR SELECT
  USING (
    business_id IN (
      SELECT id FROM businesses WHERE owner_id = auth.uid()
    )
  );

-- Policy: Users can insert exclude parameters for their business
CREATE POLICY "Users can insert exclude parameters for their business"
  ON industry_exclude_parameter
  FOR INSERT
  WITH CHECK (
    business_id IN (
      SELECT id FROM businesses WHERE owner_id = auth.uid()
    )
  );

-- Policy: Users can update exclude parameters for their business
CREATE POLICY "Users can update their business exclude parameters"
  ON industry_exclude_parameter
  FOR UPDATE
  USING (
    business_id IN (
      SELECT id FROM businesses WHERE owner_id = auth.uid()
    )
  );

-- Policy: Users can delete exclude parameters for their business
CREATE POLICY "Users can delete their business exclude parameters"
  ON industry_exclude_parameter
  FOR DELETE
  USING (
    business_id IN (
      SELECT id FROM businesses WHERE owner_id = auth.uid()
    )
  );

-- Comments for documentation
COMMENT ON TABLE industry_exclude_parameter IS 'Stores exclude parameters for industries (e.g., Laundry, Pets, Smoking)';
COMMENT ON COLUMN industry_exclude_parameter.id IS 'Primary key - UUID generated automatically';
COMMENT ON COLUMN industry_exclude_parameter.business_id IS 'Foreign key to businesses table - multi-tenant isolation';
COMMENT ON COLUMN industry_exclude_parameter.industry_id IS 'Foreign key to industries table - links parameter to specific industry';
COMMENT ON COLUMN industry_exclude_parameter.name IS 'Exclude parameter name (e.g., "Laundry", "Pets", "Smoking")';
COMMENT ON COLUMN industry_exclude_parameter.description IS 'Optional description of the exclude parameter';
COMMENT ON COLUMN industry_exclude_parameter.price IS 'Additional price for this exclude parameter';
COMMENT ON COLUMN industry_exclude_parameter.time_minutes IS 'Additional time duration in minutes for this parameter';
COMMENT ON COLUMN industry_exclude_parameter.display IS 'Where this parameter should be displayed';
COMMENT ON COLUMN industry_exclude_parameter.service_category IS 'Comma-separated service categories this parameter applies to';
COMMENT ON COLUMN industry_exclude_parameter.frequency IS 'Comma-separated frequencies this parameter applies to';
COMMENT ON COLUMN industry_exclude_parameter.show_based_on_frequency IS 'Whether to filter display based on frequency';
COMMENT ON COLUMN industry_exclude_parameter.show_based_on_service_category IS 'Whether to filter display based on service category';
COMMENT ON COLUMN industry_exclude_parameter.sort_order IS 'Order for displaying exclude parameters';
COMMENT ON COLUMN industry_exclude_parameter.created_at IS 'Timestamp when parameter was created';
COMMENT ON COLUMN industry_exclude_parameter.updated_at IS 'Timestamp when parameter was last updated';
