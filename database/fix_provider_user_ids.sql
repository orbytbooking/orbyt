-- Fix existing providers with NULL user_id
-- This script links provider records to their corresponding auth users

-- First, let's see which providers have NULL user_id
SELECT id, first_name, last_name, email, user_id, business_id 
FROM public.service_providers 
WHERE user_id IS NULL;

-- Update providers to link with their auth users
UPDATE public.service_providers sp
SET user_id = au.id
FROM auth.users au
WHERE sp.email = au.email 
  AND sp.user_id IS NULL
  AND au.raw_user_meta_data->>'role' = 'provider';

-- Verify the fix
SELECT sp.id, sp.first_name, sp.last_name, sp.email, sp.user_id, au.email as auth_email
FROM public.service_providers sp
JOIN auth.users au ON sp.user_id = au.id
WHERE sp.user_id IS NOT NULL;

-- Show any remaining providers that still need fixing
SELECT id, first_name, last_name, email, user_id 
FROM public.service_providers 
WHERE user_id IS NULL;
