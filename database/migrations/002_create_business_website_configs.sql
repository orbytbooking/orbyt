-- Create business_website_configs table for proper business isolation
CREATE TABLE IF NOT EXISTS business_website_configs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  config JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(business_id)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_business_website_configs_business_id ON business_website_configs(business_id);

-- Enable RLS
ALTER TABLE business_website_configs ENABLE ROW LEVEL SECURITY;

-- Create policy for business isolation
CREATE POLICY "Businesses can view their own website configs" ON business_website_configs
  FOR SELECT USING (business_id IN (
    SELECT id FROM businesses WHERE owner_id = auth.uid()
  ));

CREATE POLICY "Businesses can update their own website configs" ON business_website_configs
  FOR UPDATE USING (business_id IN (
    SELECT id FROM businesses WHERE owner_id = auth.uid()
  ));

CREATE POLICY "Businesses can insert their own website configs" ON business_website_configs
  FOR INSERT WITH CHECK (business_id IN (
    SELECT id FROM businesses WHERE owner_id = auth.uid()
  ));

-- Function to automatically update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for updated_at
CREATE TRIGGER update_business_website_configs_updated_at 
  BEFORE UPDATE ON business_website_configs 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
