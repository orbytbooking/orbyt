-- Enable RLS on business_website_configs table
ALTER TABLE business_website_configs ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Businesses can view their own website configs" ON business_website_configs;
DROP POLICY IF EXISTS "Businesses can update their own website configs" ON business_website_configs;
DROP POLICY IF EXISTS "Businesses can insert their own website configs" ON business_website_configs;

-- Create policy for business isolation - SELECT
CREATE POLICY "Businesses can view their own website configs" ON business_website_configs
  FOR SELECT USING (business_id IN (
    SELECT id FROM businesses WHERE owner_id = auth.uid()
  ));

-- Create policy for business isolation - UPDATE
CREATE POLICY "Businesses can update their own website configs" ON business_website_configs
  FOR UPDATE USING (business_id IN (
    SELECT id FROM businesses WHERE owner_id = auth.uid()
  ));

-- Create policy for business isolation - INSERT
CREATE POLICY "Businesses can insert their own website configs" ON business_website_configs
  FOR INSERT WITH CHECK (business_id IN (
    SELECT id FROM businesses WHERE owner_id = auth.uid()
  ));

-- Create policy for business isolation - DELETE
CREATE POLICY "Businesses can delete their own website configs" ON business_website_configs
  FOR DELETE USING (business_id IN (
    SELECT id FROM businesses WHERE owner_id = auth.uid()
  ));

-- Grant necessary permissions
GRANT ALL ON business_website_configs TO authenticated;
GRANT SELECT ON business_website_configs TO anon;
