-- Setup profile and business for existing user ajofracio0723@gmail.com
-- Run this in your Supabase SQL editor

-- Create profile for the existing user
INSERT INTO public.profiles (id, full_name, phone, role, is_active, business_id, created_at, updated_at)
VALUES (
  '22db49cb-133f-4091-8f01-5bbb4893f371',  -- User ID from Supabase auth
  'AJ OFRACIO',
  '09100218519',
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
  'AJ OFRACIO Business',
  '123 Business Address',
  'Professional Services',
  'starter',
  '22db49cb-133f-4091-8f01-5bbb4893f371',  -- User ID from Supabase auth
  true,
  NOW(),
  NOW()
);

-- Update the profile to link to the business
UPDATE public.profiles 
SET business_id = (
  SELECT id FROM public.businesses 
  WHERE owner_id = '22db49cb-133f-4091-8f01-5bbb4893f371'
  LIMIT 1
)
WHERE id = '22db49cb-133f-4091-8f01-5bbb4893f371';

-- Verify the setup
SELECT 
  u.id as user_id,
  u.email,
  u.last_sign_in_at,
  p.full_name,
  p.role as profile_role,
  b.name as business_name,
  b.id as business_id
FROM auth.users u
LEFT JOIN public.profiles p ON u.id = p.id
LEFT JOIN public.businesses b ON u.id = b.owner_id
WHERE u.id = '22db49cb-133f-4091-8f01-5bbb4893f371';
