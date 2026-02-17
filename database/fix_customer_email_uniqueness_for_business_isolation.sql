-- Fix customer email uniqueness for business isolation
-- This allows the same email to exist for different businesses
-- while preventing duplicate customers for the same business

-- Step 1: Drop the existing UNIQUE constraint on email
ALTER TABLE public.customers 
DROP CONSTRAINT IF EXISTS customers_email_key;

-- Step 2: Create a unique constraint on (email, business_id) combination
-- This ensures one email can only have one customer record per business
CREATE UNIQUE INDEX IF NOT EXISTS idx_customers_email_business_unique 
ON public.customers(email, business_id);

-- Step 3: Also ensure (auth_user_id, business_id) is unique
-- This prevents the same auth user from having multiple customer records for the same business
CREATE UNIQUE INDEX IF NOT EXISTS idx_customers_auth_user_business_unique 
ON public.customers(auth_user_id, business_id) 
WHERE auth_user_id IS NOT NULL;

-- Step 4: Add a comment explaining the business isolation
COMMENT ON INDEX idx_customers_email_business_unique IS 
'Ensures email uniqueness per business, allowing same email across different businesses';

COMMENT ON INDEX idx_customers_auth_user_business_unique IS 
'Ensures one auth user can only have one customer record per business';
