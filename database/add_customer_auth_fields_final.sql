-- Add additional fields to customers table for authentication
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

ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Customers can view own data" ON public.customers;
DROP POLICY IF EXISTS "Customers can update own data" ON public.customers;
DROP POLICY IF EXISTS "Business owners can view their customers" ON public.customers;
DROP POLICY IF EXISTS "Business owners can insert customers" ON public.customers;
DROP POLICY IF EXISTS "Business owners can update their customers" ON public.customers;
DROP POLICY IF EXISTS "Allow customer signup" ON public.customers;

-- Allow authenticated users to insert their own customer record during signup
CREATE POLICY "Allow customer signup"
ON public.customers FOR INSERT
WITH CHECK (auth.uid() = auth_user_id);

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
