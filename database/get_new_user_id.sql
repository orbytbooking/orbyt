-- Get your new user ID after signup
-- Run this in your Supabase SQL editor

SELECT 
  id, 
  email, 
  created_at,
  last_sign_in_at
FROM auth.users 
ORDER BY created_at DESC
LIMIT 5;
