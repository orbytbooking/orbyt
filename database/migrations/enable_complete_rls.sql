-- Complete RLS enablement for your current database
-- This will add all missing security policies

-- Step 1: Fix NULL business_id values first, then add constraints
-- Update NULL business_id values in all tables
-- Choose which business should own NULL records:
-- For ORBIT business: '7f0111c3-1e81-487b-acbd-afde24c5f761'
-- For tech business: '29a941b2-4cb0-4150-89e4-59ec7f0581de'
UPDATE profiles SET business_id = '29a941b2-4cb0-4150-89e4-59ec7f0581de' WHERE business_id IS NULL;
UPDATE services SET business_id = '29a941b2-4cb0-4150-89e4-59ec7f0581de' WHERE business_id IS NULL;
UPDATE provider_availability SET business_id = '29a941b2-4cb0-4150-89e4-59ec7f0581de' WHERE business_id IS NULL;

-- Now add NOT NULL constraints
ALTER TABLE profiles ALTER COLUMN business_id SET NOT NULL;
ALTER TABLE services ALTER COLUMN business_id SET NOT NULL;
ALTER TABLE provider_availability ALTER COLUMN business_id SET NOT NULL;

-- Step 2: Add missing foreign key for staff
ALTER TABLE staff 
ADD CONSTRAINT staff_business_id_fkey 
FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE;

-- Step 3: Fix customers unique constraint to be per-business
ALTER TABLE customers DROP CONSTRAINT IF EXISTS customers_email_key;
ALTER TABLE customers 
ADD CONSTRAINT customers_business_email_unique 
UNIQUE(business_id, email);

-- Step 3b: Handle duplicate services before adding unique constraint
-- First, remove duplicates from services table
DELETE FROM services 
WHERE ctid NOT IN (
  SELECT min(ctid) 
  FROM services 
  GROUP BY business_id, name
);

-- Now add unique constraint for services
ALTER TABLE services 
ADD CONSTRAINT services_business_name_unique 
UNIQUE(business_id, name);

-- Step 4: Enable RLS on all tables
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE services ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_providers ENABLE ROW LEVEL SECURITY;
ALTER TABLE provider_availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff ENABLE ROW LEVEL SECURITY;

-- Step 5: Drop existing policies if they exist
DO $$
BEGIN
    -- Customers policies
    DROP POLICY IF EXISTS "Business users can view their own customers" ON customers;
    DROP POLICY IF EXISTS "Business users can insert their own customers" ON customers;
    DROP POLICY IF EXISTS "Business users can update their own customers" ON customers;
    DROP POLICY IF EXISTS "Business users can delete their own customers" ON customers;
    
    -- Bookings policies
    DROP POLICY IF EXISTS "Business users can view their own bookings" ON bookings;
    DROP POLICY IF EXISTS "Business users can insert their own bookings" ON bookings;
    DROP POLICY IF EXISTS "Business users can update their own bookings" ON bookings;
    DROP POLICY IF EXISTS "Business users can delete their own bookings" ON bookings;
    
    -- Services policies
    DROP POLICY IF EXISTS "Business users can view their own services" ON services;
    DROP POLICY IF EXISTS "Business users can insert their own services" ON services;
    DROP POLICY IF EXISTS "Business users can update their own services" ON services;
    DROP POLICY IF EXISTS "Business users can delete their own services" ON services;
    
    -- Profiles policies
    DROP POLICY IF EXISTS "Business users can view their own profiles" ON profiles;
    DROP POLICY IF EXISTS "Business users can insert their own profiles" ON profiles;
    DROP POLICY IF EXISTS "Business users can update their own profiles" ON profiles;
    DROP POLICY IF EXISTS "Business users can delete their own profiles" ON profiles;
    
    -- Leads policies
    DROP POLICY IF EXISTS "Business users can view their own leads" ON leads;
    DROP POLICY IF EXISTS "Business users can insert their own leads" ON leads;
    DROP POLICY IF EXISTS "Business users can update their own leads" ON leads;
    DROP POLICY IF EXISTS "Business users can delete their own leads" ON leads;
    
    -- Coupons policies
    DROP POLICY IF EXISTS "Business users can view their own coupons" ON coupons;
    DROP POLICY IF EXISTS "Business users can insert their own coupons" ON coupons;
    DROP POLICY IF EXISTS "Business users can update their own coupons" ON coupons;
    DROP POLICY IF EXISTS "Business users can delete their own coupons" ON coupons;
    
    -- Service providers policies
    DROP POLICY IF EXISTS "Business users can view their own service_providers" ON service_providers;
    DROP POLICY IF EXISTS "Business users can insert their own service_providers" ON service_providers;
    DROP POLICY IF EXISTS "Business users can update their own service_providers" ON service_providers;
    DROP POLICY IF EXISTS "Business users can delete their own service_providers" ON service_providers;
    
    -- Provider availability policies
    DROP POLICY IF EXISTS "Business users can view their own provider_availability" ON provider_availability;
    DROP POLICY IF EXISTS "Business users can insert their own provider_availability" ON provider_availability;
    DROP POLICY IF EXISTS "Business users can update their own provider_availability" ON provider_availability;
    DROP POLICY IF EXISTS "Business users can delete their own provider_availability" ON provider_availability;
    
    -- Staff policies
    DROP POLICY IF EXISTS "Business users can view their own staff" ON staff;
    DROP POLICY IF EXISTS "Business users can insert their own staff" ON staff;
    DROP POLICY IF EXISTS "Business users can update their own staff" ON staff;
    DROP POLICY IF EXISTS "Business users can delete their own staff" ON staff;
END $$;

-- Step 6: Create proper RLS policies for all tables

-- Customers policies
CREATE POLICY "Business users can view their own customers" ON customers
  FOR SELECT USING (business_id IN (SELECT id FROM businesses WHERE owner_id = auth.uid()));

CREATE POLICY "Business users can insert their own customers" ON customers
  FOR INSERT WITH CHECK (business_id IN (SELECT id FROM businesses WHERE owner_id = auth.uid()));

CREATE POLICY "Business users can update their own customers" ON customers
  FOR UPDATE USING (business_id IN (SELECT id FROM businesses WHERE owner_id = auth.uid()));

CREATE POLICY "Business users can delete their own customers" ON customers
  FOR DELETE USING (business_id IN (SELECT id FROM businesses WHERE owner_id = auth.uid()));

-- Bookings policies
CREATE POLICY "Business users can view their own bookings" ON bookings
  FOR SELECT USING (business_id IN (SELECT id FROM businesses WHERE owner_id = auth.uid()));

CREATE POLICY "Business users can insert their own bookings" ON bookings
  FOR INSERT WITH CHECK (business_id IN (SELECT id FROM businesses WHERE owner_id = auth.uid()));

CREATE POLICY "Business users can update their own bookings" ON bookings
  FOR UPDATE USING (business_id IN (SELECT id FROM businesses WHERE owner_id = auth.uid()));

CREATE POLICY "Business users can delete their own bookings" ON bookings
  FOR DELETE USING (business_id IN (SELECT id FROM businesses WHERE owner_id = auth.uid()));

-- Services policies
CREATE POLICY "Business users can view their own services" ON services
  FOR SELECT USING (business_id IN (SELECT id FROM businesses WHERE owner_id = auth.uid()));

CREATE POLICY "Business users can insert their own services" ON services
  FOR INSERT WITH CHECK (business_id IN (SELECT id FROM businesses WHERE owner_id = auth.uid()));

CREATE POLICY "Business users can update their own services" ON services
  FOR UPDATE USING (business_id IN (SELECT id FROM businesses WHERE owner_id = auth.uid()));

CREATE POLICY "Business users can delete their own services" ON services
  FOR DELETE USING (business_id IN (SELECT id FROM businesses WHERE owner_id = auth.uid()));

-- Profiles policies
CREATE POLICY "Business users can view their own profiles" ON profiles
  FOR SELECT USING (business_id IN (SELECT id FROM businesses WHERE owner_id = auth.uid()));

CREATE POLICY "Business users can insert their own profiles" ON profiles
  FOR INSERT WITH CHECK (business_id IN (SELECT id FROM businesses WHERE owner_id = auth.uid()));

CREATE POLICY "Business users can update their own profiles" ON profiles
  FOR UPDATE USING (business_id IN (SELECT id FROM businesses WHERE owner_id = auth.uid()));

CREATE POLICY "Business users can delete their own profiles" ON profiles
  FOR DELETE USING (business_id IN (SELECT id FROM businesses WHERE owner_id = auth.uid()));

-- Leads policies
CREATE POLICY "Business users can view their own leads" ON leads
  FOR SELECT USING (business_id IN (SELECT id FROM businesses WHERE owner_id = auth.uid()));

CREATE POLICY "Business users can insert their own leads" ON leads
  FOR INSERT WITH CHECK (business_id IN (SELECT id FROM businesses WHERE owner_id = auth.uid()));

CREATE POLICY "Business users can update their own leads" ON leads
  FOR UPDATE USING (business_id IN (SELECT id FROM businesses WHERE owner_id = auth.uid()));

CREATE POLICY "Business users can delete their own leads" ON leads
  FOR DELETE USING (business_id IN (SELECT id FROM businesses WHERE owner_id = auth.uid()));

-- Coupons policies
CREATE POLICY "Business users can view their own coupons" ON coupons
  FOR SELECT USING (business_id IN (SELECT id FROM businesses WHERE owner_id = auth.uid()));

CREATE POLICY "Business users can insert their own coupons" ON coupons
  FOR INSERT WITH CHECK (business_id IN (SELECT id FROM businesses WHERE owner_id = auth.uid()));

CREATE POLICY "Business users can update their own coupons" ON coupons
  FOR UPDATE USING (business_id IN (SELECT id FROM businesses WHERE owner_id = auth.uid()));

CREATE POLICY "Business users can delete their own coupons" ON coupons
  FOR DELETE USING (business_id IN (SELECT id FROM businesses WHERE owner_id = auth.uid()));

-- Service providers policies
CREATE POLICY "Business users can view their own service_providers" ON service_providers
  FOR SELECT USING (business_id IN (SELECT id FROM businesses WHERE owner_id = auth.uid()));

CREATE POLICY "Business users can insert their own service_providers" ON service_providers
  FOR INSERT WITH CHECK (business_id IN (SELECT id FROM businesses WHERE owner_id = auth.uid()));

CREATE POLICY "Business users can update their own service_providers" ON service_providers
  FOR UPDATE USING (business_id IN (SELECT id FROM businesses WHERE owner_id = auth.uid()));

CREATE POLICY "Business users can delete their own service_providers" ON service_providers
  FOR DELETE USING (business_id IN (SELECT id FROM businesses WHERE owner_id = auth.uid()));

-- Provider availability policies
CREATE POLICY "Business users can view their own provider_availability" ON provider_availability
  FOR SELECT USING (business_id IN (SELECT id FROM businesses WHERE owner_id = auth.uid()));

CREATE POLICY "Business users can insert their own provider_availability" ON provider_availability
  FOR INSERT WITH CHECK (business_id IN (SELECT id FROM businesses WHERE owner_id = auth.uid()));

CREATE POLICY "Business users can update their own provider_availability" ON provider_availability
  FOR UPDATE USING (business_id IN (SELECT id FROM businesses WHERE owner_id = auth.uid()));

CREATE POLICY "Business users can delete their own provider_availability" ON provider_availability
  FOR DELETE USING (business_id IN (SELECT id FROM businesses WHERE owner_id = auth.uid()));

-- Staff policies
CREATE POLICY "Business users can view their own staff" ON staff
  FOR SELECT USING (business_id IN (SELECT id FROM businesses WHERE owner_id = auth.uid()));

CREATE POLICY "Business users can insert their own staff" ON staff
  FOR INSERT WITH CHECK (business_id IN (SELECT id FROM businesses WHERE owner_id = auth.uid()));

CREATE POLICY "Business users can update their own staff" ON staff
  FOR UPDATE USING (business_id IN (SELECT id FROM businesses WHERE owner_id = auth.uid()));

CREATE POLICY "Business users can delete their own staff" ON staff
  FOR DELETE USING (business_id IN (SELECT id FROM businesses WHERE owner_id = auth.uid()));

-- Step 7: Verify RLS is enabled
SELECT 
  schemaname,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('customers', 'bookings', 'services', 'profiles', 'leads', 'staff', 'coupons', 'service_providers', 'provider_availability')
ORDER BY tablename;

-- Step 8: Verify policies exist
SELECT 
  tablename,
  policyname,
  cmd as operation
FROM pg_policies 
WHERE tablename IN ('customers', 'bookings', 'services', 'profiles', 'leads', 'staff', 'coupons', 'service_providers', 'provider_availability')
ORDER BY tablename, policyname;
