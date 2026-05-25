-- Add additional fields to customers table for authentication
-- This ensures customers can have proper authentication through Supabase

-- Add avatar field for profile pictures
ALTER TABLE public.customers
ADD COLUMN IF NOT EXISTS avatar TEXT;

-- Add notification preferences
ALTER TABLE public.customers
ADD COLUMN IF NOT EXISTS email_notifications BOOLEAN DEFAULT true;

ALTER TABLE public.customers
ADD COLUMN IF NOT EXISTS sms_notifications BOOLEAN DEFAULT true;

ALTER TABLE public.customers
ADD COLUMN IF NOT EXISTS push_notifications BOOLEAN DEFAULT true;

-- Add index on auth_user_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_customers_auth_user_id ON public.customers(auth_user_id);

-- Add index on email for faster lookups
CREATE INDEX IF NOT EXISTS idx_customers_email ON public.customers(email);

-- Enable RLS on customers table
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Customers can view own data" ON public.customers;
DROP POLICY IF EXISTS "Customers can update own data" ON public.customers;
DROP POLICY IF EXISTS "Business owners can view their customers" ON public.customers;
DROP POLICY IF EXISTS "Business owners can insert customers" ON public.customers;
DROP POLICY IF EXISTS "Business owners can update their customers" ON public.customers;

-- Policy: Customers can read their own data
CREATE POLICY "Customers can view own data"
ON public.customers
FOR SELECT
USING (auth.uid() = auth_user_id);

-- Policy: Customers can update their own data
CREATE POLICY "Customers can update own data"
ON public.customers
FOR UPDATE
USING (auth.uid() = auth_user_id);

-- Policy: Business owners and admins can view their customers
CREATE POLICY "Business owners can view their customers"
ON public.customers
FOR SELECT
USING (
  business_id IN (
    SELECT id FROM public.businesses WHERE owner_id = auth.uid()
  )
);

-- Policy: Business owners and admins can insert customers
CREATE POLICY "Business owners can insert customers"
ON public.customers
FOR INSERT
WITH CHECK (
  business_id IN (
    SELECT id FROM public.businesses WHERE owner_id = auth.uid()
  )
);

-- Policy: Business owners and admins can update their customers
CREATE POLICY "Business owners can update their customers"
ON public.customers
FOR UPDATE
USING (
  business_id IN (
    SELECT id FROM public.businesses WHERE owner_id = auth.uid()
  )
);
