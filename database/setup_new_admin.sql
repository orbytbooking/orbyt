-- Setup profile and business for new admin
-- Replace 'YOUR-NEW-USER-ID' with your actual user ID from the previous query

-- Create profile for the new user
INSERT INTO public.profiles (id, full_name, phone, role, is_active, business_id, created_at, updated_at)
VALUES (
  'YOUR-NEW-USER-ID',  -- Replace with your actual user ID
  'Admin User',
  '123-456-7890',
  'admin',
  true,
  NULL,
  NOW(),
  NOW()
) ON CONFLICT (id) DO UPDATE SET
  full_name = EXCLUDED.full_name,
  phone = EXCLUDED.phone,
  role = EXCLUDED.role,
  updated_at = NOW();

-- Create business for the user
INSERT INTO public.businesses (id, name, address, category, plan, owner_id, is_active, created_at, updated_at)
VALUES (
  gen_random_uuid(),
  'Admin Business',
  '123 Business Address',
  'Professional Services',
  'starter',
  'YOUR-NEW-USER-ID',  -- Replace with your actual user ID
  true,
  NOW(),
  NOW()
);

-- Update the profile to link to the business
UPDATE public.profiles 
SET business_id = (
  SELECT id FROM public.businesses 
  WHERE owner_id = 'YOUR-NEW-USER-ID'
  LIMIT 1
)
WHERE id = 'YOUR-NEW-USER-ID';
