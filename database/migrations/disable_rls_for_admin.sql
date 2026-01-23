-- Migration: Disable RLS for service_providers table temporarily for admin operations
-- This is a temporary fix to allow admin operations to work

-- Disable RLS temporarily (for testing)
ALTER TABLE service_providers DISABLE ROW LEVEL SECURITY;

-- Alternative: Create a bypass function for admin operations
CREATE OR REPLACE FUNCTION create_provider_admin(
  p_user_id UUID,
  p_business_id UUID,
  p_first_name TEXT,
  p_last_name TEXT,
  p_email TEXT,
  p_phone TEXT,
  p_address TEXT,
  p_specialization TEXT DEFAULT 'General Services',
  p_rating DECIMAL DEFAULT 0.0,
  p_completed_jobs INTEGER DEFAULT 0,
  p_status TEXT DEFAULT 'active',
  p_provider_type TEXT DEFAULT 'individual',
  p_send_email_notification BOOLEAN DEFAULT false
)
RETURNS UUID AS $$
DECLARE
  provider_id UUID;
BEGIN
  -- Insert provider bypassing RLS
  INSERT INTO service_providers (
    user_id,
    business_id,
    first_name,
    last_name,
    email,
    phone,
    address,
    specialization,
    rating,
    completed_jobs,
    status,
    provider_type,
    send_email_notification
  ) VALUES (
    p_user_id,
    p_business_id,
    p_first_name,
    p_last_name,
    p_email,
    p_phone,
    p_address,
    p_specialization,
    p_rating,
    p_completed_jobs,
    p_status,
    p_provider_type,
    p_send_email_notification
  ) RETURNING id INTO provider_id;
  
  RETURN provider_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant usage to authenticated users
GRANT EXECUTE ON FUNCTION create_provider_admin TO authenticated;
GRANT EXECUTE ON FUNCTION create_provider_admin TO service_role;

-- Log completion
DO $$
BEGIN
    RAISE NOTICE 'Migration completed: Disabled RLS and created admin function';
END $$;
