-- Check if users exist and create test user if needed
-- Run this in your Supabase SQL editor

-- Check existing users
SELECT 
  id, 
  email, 
  created_at,
  last_sign_in_at,
  raw_user_meta_data
FROM auth.users 
ORDER BY created_at DESC;

-- Check existing profiles
SELECT 
  p.id, 
  p.full_name, 
  p.role, 
  p.business_id,
  u.email,
  p.created_at
FROM public.profiles p
JOIN auth.users u ON p.id = u.id
ORDER BY p.created_at DESC;

-- Check existing businesses
SELECT 
  id, 
  name, 
  owner_id,
  created_at,
  is_active
FROM public.businesses 
ORDER BY created_at DESC;
