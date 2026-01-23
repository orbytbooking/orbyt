-- Migration to add business_id to tables that are missing multi-tenant isolation
-- This fixes the critical security gap where data was shared between businesses

-- Step 1: Add business_id to services table
ALTER TABLE services ADD COLUMN IF NOT EXISTS business_id UUID REFERENCES businesses(id) ON DELETE CASCADE;

-- Add unique constraint per business for services
ALTER TABLE services ADD CONSTRAINT services_business_name_unique UNIQUE(business_id, name);

-- Update existing services to assign them to businesses (this is tricky - you may need to handle this manually)
-- For now, we'll set them to NULL and you'll need to update them based on your business logic

-- Step 2: Add business_id to profiles table (for providers)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS business_id UUID REFERENCES businesses(id) ON DELETE CASCADE;

-- Update existing profiles to assign them to businesses
-- This assumes service_providers table has the mapping
UPDATE profiles p
SET business_id = sp.business_id
FROM service_providers sp
WHERE p.id = sp.user_id;

-- Step 3: Add business_id to provider_availability table
ALTER TABLE provider_availability ADD COLUMN IF NOT EXISTS business_id UUID REFERENCES businesses(id) ON DELETE CASCADE;

-- Update provider_availability business_id based on provider
UPDATE provider_availability pa
SET business_id = p.business_id
FROM profiles p
WHERE pa.provider_id = p.id;

-- Step 4: Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_services_business_id ON services(business_id);
CREATE INDEX IF NOT EXISTS idx_profiles_business_id ON profiles(business_id);
CREATE INDEX IF NOT EXISTS idx_provider_availability_business_id ON provider_availability(business_id);

-- Step 5: Enable RLS on tables that don't have it
ALTER TABLE services ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE provider_availability ENABLE ROW LEVEL SECURITY;

-- Step 6: Drop existing policies if they exist, then create new ones
DO $$
BEGIN
  -- Services policies
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

DO $$
BEGIN
  -- Profiles policies
  DROP POLICY IF EXISTS "Business users can view their own profiles" ON profiles;
  DROP POLICY IF EXISTS "Business users can insert their own profiles" ON profiles;
  DROP POLICY IF EXISTS "Business users can update their own profiles" ON profiles;
  DROP POLICY IF EXISTS "Business users can delete their own profiles" ON profiles;
  
  CREATE POLICY "Business users can view their own profiles" ON profiles
    FOR SELECT USING (business_id IN (SELECT id FROM businesses WHERE owner_id = auth.uid()));

  CREATE POLICY "Business users can insert their own profiles" ON profiles
    FOR INSERT WITH CHECK (business_id IN (SELECT id FROM businesses WHERE owner_id = auth.uid()));

  CREATE POLICY "Business users can update their own profiles" ON profiles
    FOR UPDATE USING (business_id IN (SELECT id FROM businesses WHERE owner_id = auth.uid()));

  CREATE POLICY "Business users can delete their own profiles" ON profiles
    FOR DELETE USING (business_id IN (SELECT id FROM businesses WHERE owner_id = auth.uid()));
END $$;

DO $$
BEGIN
  -- Provider availability policies
  DROP POLICY IF EXISTS "Business users can view their own provider_availability" ON provider_availability;
  DROP POLICY IF EXISTS "Business users can insert their own provider_availability" ON provider_availability;
  DROP POLICY IF EXISTS "Business users can update their own provider_availability" ON provider_availability;
  DROP POLICY IF EXISTS "Business users can delete their own provider_availability" ON provider_availability;
  
  CREATE POLICY "Business users can view their own provider_availability" ON provider_availability
    FOR SELECT USING (business_id IN (SELECT id FROM businesses WHERE owner_id = auth.uid()));

  CREATE POLICY "Business users can insert their own provider_availability" ON provider_availability
    FOR INSERT WITH CHECK (business_id IN (SELECT id FROM businesses WHERE owner_id = auth.uid()));

  CREATE POLICY "Business users can update their own provider_availability" ON provider_availability
    FOR UPDATE USING (business_id IN (SELECT id FROM businesses WHERE owner_id = auth.uid()));

  CREATE POLICY "Business users can delete their own provider_availability" ON provider_availability
    FOR DELETE USING (business_id IN (SELECT id FROM businesses WHERE owner_id = auth.uid()));
END $$;

-- Step 7: Add NOT NULL constraints (run this after you've properly assigned business_id)
-- ALTER TABLE services ALTER COLUMN business_id SET NOT NULL;
-- ALTER TABLE profiles ALTER COLUMN business_id SET NOT NULL;
-- ALTER TABLE provider_availability ALTER COLUMN business_id SET NOT NULL;

-- Comments for documentation
COMMENT ON COLUMN services.business_id IS 'Added for multi-tenant isolation - services belong to specific businesses';
COMMENT ON COLUMN profiles.business_id IS 'Added for multi-tenant isolation - providers work for specific businesses';
COMMENT ON COLUMN provider_availability.business_id IS 'Added for multi-tenant isolation - availability is business-specific';
