-- Create a test admin user
-- Run this in your Supabase SQL editor

-- Insert test user (you'll need to sign up through the app first, then run this)
-- Or use Supabase Auth to create a user manually

-- After creating a user, create their profile and business
-- Replace 'your-user-id' with the actual user ID from auth.users table

-- Example: Create profile for existing user
INSERT INTO public.profiles (id, full_name, phone, role, is_active, business_id)
VALUES (
  'your-user-id',  -- Replace with actual user ID
  'Test Admin',
  '123-456-7890',
  'admin',
  true,
  NULL
) ON CONFLICT (id) DO UPDATE SET
  full_name = EXCLUDED.full_name,
  phone = EXCLUDED.phone,
  role = EXCLUDED.role,
  updated_at = NOW();

-- Example: Create business for the user
INSERT INTO public.businesses (id, name, address, category, plan, owner_id, is_active)
VALUES (
  gen_random_uuid(),
  'Test Business',
  '123 Test Street',
  'Technology',
  'starter',
  'your-user-id',  -- Replace with actual user ID
  true
);
