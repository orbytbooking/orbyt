-- Simple industries table setup without RLS (API handles authorization)
-- This script creates the table without RLS since we handle auth in the API

-- Create table if not exists
CREATE TABLE IF NOT EXISTS industries (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  is_custom BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(name, business_id)
);

-- Create indexes if not exist
CREATE INDEX IF NOT EXISTS idx_industries_business_id ON industries(business_id);
CREATE INDEX IF NOT EXISTS idx_industries_name ON industries(name);
CREATE INDEX IF NOT EXISTS idx_industries_is_custom ON industries(is_custom);

-- Disable RLS since we handle authorization in API layer
ALTER TABLE industries DISABLE ROW LEVEL SECURITY;

-- Create function if not exists
CREATE OR REPLACE FUNCTION update_industries_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if exists and recreate
DROP TRIGGER IF EXISTS trigger_update_industries_updated_at ON industries;
CREATE TRIGGER trigger_update_industries_updated_at
  BEFORE UPDATE ON industries
  FOR EACH ROW
  EXECUTE FUNCTION update_industries_updated_at();
