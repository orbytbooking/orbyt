-- Remove only the redundant users table
-- Keep everything else since businesses.owner_id handles tenant relationship

-- Drop the redundant users table
DROP TABLE IF EXISTS public.users CASCADE;

-- Verify the remaining tables
SELECT 
  'Tables After Cleanup' as status,
  table_name,
  table_type
FROM information_schema.tables 
WHERE table_schema = 'public'
ORDER BY table_name;

-- Show the tenant relationship is already handled
SELECT 
  'Tenant Relationship via businesses.owner_id' as info,
  b.id as business_id,
  b.name as business_name,
  b.owner_id as tenant_user_id,
  u.email as tenant_email
FROM businesses b
JOIN auth.users u ON b.owner_id = u.id
ORDER BY b.name;

-- Comments
COMMENT ON SCHEMA public IS 'Clean schema - businesses.owner_id handles tenant relationship';
