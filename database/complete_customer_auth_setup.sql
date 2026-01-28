-- COMPLETE CUSTOMER AUTHENTICATION SETUP
-- Run this entire script in Supabase SQL Editor

-- ============================================
-- PART 1: Add missing columns to customers table
-- ============================================

ALTER TABLE public.customers
ADD COLUMN IF NOT EXISTS avatar TEXT;

ALTER TABLE public.customers
ADD COLUMN IF NOT EXISTS email_notifications BOOLEAN DEFAULT true;

ALTER TABLE public.customers
ADD COLUMN IF NOT EXISTS sms_notifications BOOLEAN DEFAULT true;

ALTER TABLE public.customers
ADD COLUMN IF NOT EXISTS push_notifications BOOLEAN DEFAULT true;

CREATE INDEX IF NOT EXISTS idx_customers_auth_user_id ON public.customers(auth_user_id);
CREATE INDEX IF NOT EXISTS idx_customers_email ON public.customers(email);

-- ============================================
-- PART 2: Setup Row Level Security
-- ============================================

ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

-- Drop all existing policies
DROP POLICY IF EXISTS "Customers can view own data" ON public.customers;
DROP POLICY IF EXISTS "Customers can update own data" ON public.customers;
DROP POLICY IF EXISTS "Business owners can view their customers" ON public.customers;
DROP POLICY IF EXISTS "Business owners can insert customers" ON public.customers;
DROP POLICY IF EXISTS "Business owners can update their customers" ON public.customers;

-- Create new policies
CREATE POLICY "Customers can view own data"
ON public.customers FOR SELECT
USING (auth.uid() = auth_user_id);

CREATE POLICY "Customers can update own data"
ON public.customers FOR UPDATE
USING (auth.uid() = auth_user_id);

CREATE POLICY "Business owners can view their customers"
ON public.customers FOR SELECT
USING (business_id IN (SELECT id FROM public.businesses WHERE owner_id = auth.uid()));

CREATE POLICY "Business owners can insert customers"
ON public.customers FOR INSERT
WITH CHECK (business_id IN (SELECT id FROM public.businesses WHERE owner_id = auth.uid()));

CREATE POLICY "Business owners can update their customers"
ON public.customers FOR UPDATE
USING (business_id IN (SELECT id FROM public.businesses WHERE owner_id = auth.uid()));

-- ============================================
-- PART 3: Create trigger function for automatic customer creation
-- ============================================

CREATE OR REPLACE FUNCTION public.handle_new_customer_user()
RETURNS TRIGGER AS $$
DECLARE
  default_business_id uuid;
BEGIN
  -- Only proceed if the user has role 'customer' in metadata
  IF NEW.raw_user_meta_data->>'role' = 'customer' THEN
    -- Get the first active business
    SELECT id INTO default_business_id
    FROM public.businesses
    WHERE is_active = true
    LIMIT 1;

    -- Only insert if customer doesn't already exist
    IF NOT EXISTS (SELECT 1 FROM public.customers WHERE auth_user_id = NEW.id) THEN
      INSERT INTO public.customers (
        auth_user_id,
        email,
        name,
        phone,
        address,
        business_id,
        status,
        avatar,
        email_notifications,
        sms_notifications,
        push_notifications
      ) VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', 'Customer'),
        COALESCE(NEW.raw_user_meta_data->>'phone', ''),
        COALESCE(NEW.raw_user_meta_data->>'address', ''),
        default_business_id,
        'active',
        NULL,
        true,
        true,
        true
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create the trigger
DROP TRIGGER IF EXISTS on_auth_user_created_customer ON auth.users;
CREATE TRIGGER on_auth_user_created_customer
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_customer_user();

-- ============================================
-- PART 4: Create customer records for existing auth users
-- ============================================

-- This will create customer records for any existing auth users that don't have them
DO $$
DECLARE
  user_record RECORD;
  default_business_id uuid;
BEGIN
  -- Get the first active business
  SELECT id INTO default_business_id
  FROM public.businesses
  WHERE is_active = true
  LIMIT 1;

  -- Loop through auth users with role 'customer' who don't have a customer record
  FOR user_record IN 
    SELECT u.id, u.email, u.raw_user_meta_data
    FROM auth.users u
    WHERE u.raw_user_meta_data->>'role' = 'customer'
    AND NOT EXISTS (
      SELECT 1 FROM public.customers c WHERE c.auth_user_id = u.id
    )
  LOOP
    INSERT INTO public.customers (
      auth_user_id,
      email,
      name,
      phone,
      address,
      business_id,
      status,
      avatar,
      email_notifications,
      sms_notifications,
      push_notifications
    ) VALUES (
      user_record.id,
      user_record.email,
      COALESCE(user_record.raw_user_meta_data->>'full_name', 'Customer'),
      COALESCE(user_record.raw_user_meta_data->>'phone', ''),
      COALESCE(user_record.raw_user_meta_data->>'address', ''),
      default_business_id,
      'active',
      NULL,
      true,
      true,
      true
    );
    
    RAISE NOTICE 'Created customer record for user: %', user_record.email;
  END LOOP;
END $$;

-- ============================================
-- PART 5: Verify setup
-- ============================================

-- Check how many customer records were created
SELECT 
  COUNT(*) as total_customers,
  COUNT(CASE WHEN auth_user_id IS NOT NULL THEN 1 END) as customers_with_auth
FROM public.customers;

-- Show recent customer records
SELECT 
  c.id,
  c.email,
  c.name,
  c.auth_user_id,
  c.created_at
FROM public.customers c
ORDER BY c.created_at DESC
LIMIT 5;
