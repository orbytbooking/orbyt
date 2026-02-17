-- Ensure customers can log in: allow them to SELECT and UPDATE their own row
-- Run this in Supabase SQL Editor if you get "Customer account not found for this business. Please sign up first"
-- when logging in after a successful signup.

-- Enable RLS if not already
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

-- Allow customer signup (INSERT own row) - in case only this was run before
DROP POLICY IF EXISTS "Allow customer signup" ON public.customers;
CREATE POLICY "Allow customer signup"
ON public.customers FOR INSERT
WITH CHECK (auth.uid() = auth_user_id);

-- Allow customers to read their own row (required for login lookup)
DROP POLICY IF EXISTS "Customers can view own data" ON public.customers;
CREATE POLICY "Customers can view own data"
ON public.customers FOR SELECT
USING (auth.uid() = auth_user_id);

-- Allow customers to update their own row (for profile updates)
DROP POLICY IF EXISTS "Customers can update own data" ON public.customers;
CREATE POLICY "Customers can update own data"
ON public.customers FOR UPDATE
USING (auth.uid() = auth_user_id);
