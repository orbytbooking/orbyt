-- Migration: Create industry_pricing_parameter table
-- Created: 2026-01-24
-- Description: Creates the industry_pricing_parameter table to store pricing parameters/tiers for industries

CREATE TABLE IF NOT EXISTS industry_pricing_parameter (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  industry_id UUID NOT NULL REFERENCES industries(id) ON DELETE CASCADE,
  
  -- Basic information
  name TEXT NOT NULL,
  description TEXT,
  variable_category TEXT NOT NULL,
  
  -- Pricing and time
  price DECIMAL(10, 2) DEFAULT 0,
  time_minutes INTEGER DEFAULT 0,
  
  -- Display settings
  display TEXT DEFAULT 'Customer Frontend, Backend & Admin' CHECK (display IN ('Customer Frontend, Backend & Admin', 'Customer Backend & Admin', 'Admin Only')),
  
  -- Service category and frequency filters
  service_category TEXT,
  service_category2 TEXT,
  frequency TEXT,
  
  -- Conditional display flags
  is_default BOOLEAN DEFAULT false,
  show_based_on_frequency BOOLEAN DEFAULT false,
  show_based_on_service_category BOOLEAN DEFAULT false,
  show_based_on_service_category2 BOOLEAN DEFAULT false,
  
  -- Exclusions (stored as arrays of IDs/references)
  excluded_extras UUID[],
  excluded_services UUID[],
  excluded_providers TEXT[],
  exclude_parameters INTEGER[],
  
  -- Sort order
  sort_order INTEGER DEFAULT 0,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_industry_pricing_parameter_business_id ON industry_pricing_parameter(business_id);
CREATE INDEX IF NOT EXISTS idx_industry_pricing_parameter_industry_id ON industry_pricing_parameter(industry_id);
CREATE INDEX IF NOT EXISTS idx_industry_pricing_parameter_variable_category ON industry_pricing_parameter(variable_category);
CREATE INDEX IF NOT EXISTS idx_industry_pricing_parameter_sort_order ON industry_pricing_parameter(sort_order);
CREATE INDEX IF NOT EXISTS idx_industry_pricing_parameter_is_default ON industry_pricing_parameter(is_default);

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_industry_pricing_parameter_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_industry_pricing_parameter_updated_at
  BEFORE UPDATE ON industry_pricing_parameter
  FOR EACH ROW
  EXECUTE FUNCTION update_industry_pricing_parameter_updated_at();

-- Row Level Security (RLS) Policies
ALTER TABLE industry_pricing_parameter ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view pricing parameters for their business
CREATE POLICY "Users can view their business pricing parameters"
  ON industry_pricing_parameter
  FOR SELECT
  USING (
    business_id IN (
      SELECT id FROM businesses WHERE owner_id = auth.uid()
    )
  );

-- Policy: Users can insert pricing parameters for their business
CREATE POLICY "Users can insert pricing parameters for their business"
  ON industry_pricing_parameter
  FOR INSERT
  WITH CHECK (
    business_id IN (
      SELECT id FROM businesses WHERE owner_id = auth.uid()
    )
  );

-- Policy: Users can update pricing parameters for their business
CREATE POLICY "Users can update their business pricing parameters"
  ON industry_pricing_parameter
  FOR UPDATE
  USING (
    business_id IN (
      SELECT id FROM businesses WHERE owner_id = auth.uid()
    )
  );

-- Policy: Users can delete pricing parameters for their business
CREATE POLICY "Users can delete their business pricing parameters"
  ON industry_pricing_parameter
  FOR DELETE
  USING (
    business_id IN (
      SELECT id FROM businesses WHERE owner_id = auth.uid()
    )
  );

-- Comments for documentation
COMMENT ON TABLE industry_pricing_parameter IS 'Stores pricing parameters/tiers for industries with variable categories (e.g., Sq Ft, Bedroom, Bathroom)';
COMMENT ON COLUMN industry_pricing_parameter.id IS 'Primary key - UUID generated automatically';
COMMENT ON COLUMN industry_pricing_parameter.business_id IS 'Foreign key to businesses table - multi-tenant isolation';
COMMENT ON COLUMN industry_pricing_parameter.industry_id IS 'Foreign key to industries table - links parameter to specific industry';
COMMENT ON COLUMN industry_pricing_parameter.name IS 'Parameter name (e.g., "1 - 1249 Sq Ft", "2 Bedroom")';
COMMENT ON COLUMN industry_pricing_parameter.description IS 'Optional description of the pricing parameter';
COMMENT ON COLUMN industry_pricing_parameter.variable_category IS 'Category this parameter belongs to (e.g., "Sq Ft", "Bedroom", "Bathroom")';
COMMENT ON COLUMN industry_pricing_parameter.price IS 'Price for this parameter tier';
COMMENT ON COLUMN industry_pricing_parameter.time_minutes IS 'Time duration in minutes for this parameter';
COMMENT ON COLUMN industry_pricing_parameter.display IS 'Where this parameter should be displayed';
COMMENT ON COLUMN industry_pricing_parameter.service_category IS 'Comma-separated service categories this parameter applies to';
COMMENT ON COLUMN industry_pricing_parameter.service_category2 IS 'Additional service category filter';
COMMENT ON COLUMN industry_pricing_parameter.frequency IS 'Comma-separated frequencies this parameter applies to';
COMMENT ON COLUMN industry_pricing_parameter.is_default IS 'Whether this is the default parameter for its category';
COMMENT ON COLUMN industry_pricing_parameter.show_based_on_frequency IS 'Whether to filter display based on frequency';
COMMENT ON COLUMN industry_pricing_parameter.show_based_on_service_category IS 'Whether to filter display based on service category';
COMMENT ON COLUMN industry_pricing_parameter.show_based_on_service_category2 IS 'Whether to filter display based on second service category';
COMMENT ON COLUMN industry_pricing_parameter.excluded_extras IS 'Array of extra IDs to exclude when this parameter is selected';
COMMENT ON COLUMN industry_pricing_parameter.excluded_services IS 'Array of service IDs to exclude when this parameter is selected';
COMMENT ON COLUMN industry_pricing_parameter.excluded_providers IS 'Array of provider IDs to exclude from this parameter';
COMMENT ON COLUMN industry_pricing_parameter.exclude_parameters IS 'Array of exclude parameter IDs';
COMMENT ON COLUMN industry_pricing_parameter.sort_order IS 'Order for displaying parameters within a category';
COMMENT ON COLUMN industry_pricing_parameter.created_at IS 'Timestamp when parameter was created';
COMMENT ON COLUMN industry_pricing_parameter.updated_at IS 'Timestamp when parameter was last updated';
