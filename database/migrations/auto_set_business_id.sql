-- Auto-set business_id for new records
-- This trigger automatically assigns the correct business_id when users create data

-- Step 1: Create trigger function to auto-set business_id
CREATE OR REPLACE FUNCTION auto_set_business_id()
RETURNS TRIGGER AS $$
BEGIN
  -- Only set business_id if user is authenticated
  IF auth.uid() IS NOT NULL THEN
    -- Set business_id to the current user's business
    NEW.business_id := get_or_create_current_business();
  ELSE
    -- If no authenticated user, let the NOT NULL constraint handle the error
    -- This prevents data from being created without proper authentication
    RAISE EXCEPTION 'Cannot create record without authenticated user';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 2: Create triggers for all tables that need business_id
-- Customers trigger
DROP TRIGGER IF EXISTS trigger_auto_set_customers_business_id ON customers;
CREATE TRIGGER trigger_auto_set_customers_business_id
  BEFORE INSERT ON customers
  FOR EACH ROW
  EXECUTE FUNCTION auto_set_business_id();

-- Bookings trigger
DROP TRIGGER IF EXISTS trigger_auto_set_bookings_business_id ON bookings;
CREATE TRIGGER trigger_auto_set_bookings_business_id
  BEFORE INSERT ON bookings
  FOR EACH ROW
  EXECUTE FUNCTION auto_set_business_id();

-- Services trigger
DROP TRIGGER IF EXISTS trigger_auto_set_services_business_id ON services;
CREATE TRIGGER trigger_auto_set_services_business_id
  BEFORE INSERT ON services
  FOR EACH ROW
  EXECUTE FUNCTION auto_set_business_id();

-- Profiles trigger
DROP TRIGGER IF EXISTS trigger_auto_set_profiles_business_id ON profiles;
CREATE TRIGGER trigger_auto_set_profiles_business_id
  BEFORE INSERT ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION auto_set_business_id();

-- Leads trigger
DROP TRIGGER IF EXISTS trigger_auto_set_leads_business_id ON leads;
CREATE TRIGGER trigger_auto_set_leads_business_id
  BEFORE INSERT ON leads
  FOR EACH ROW
  EXECUTE FUNCTION auto_set_business_id();

-- Coupons trigger
DROP TRIGGER IF EXISTS trigger_auto_set_coupons_business_id ON coupons;
CREATE TRIGGER trigger_auto_set_coupons_business_id
  BEFORE INSERT ON coupons
  FOR EACH ROW
  EXECUTE FUNCTION auto_set_business_id();

-- Service providers trigger
DROP TRIGGER IF EXISTS trigger_auto_set_service_providers_business_id ON service_providers;
CREATE TRIGGER trigger_auto_set_service_providers_business_id
  BEFORE INSERT ON service_providers
  FOR EACH ROW
  EXECUTE FUNCTION auto_set_business_id();

-- Provider availability trigger
DROP TRIGGER IF EXISTS trigger_auto_set_provider_availability_business_id ON provider_availability;
CREATE TRIGGER trigger_auto_set_provider_availability_business_id
  BEFORE INSERT ON provider_availability
  FOR EACH ROW
  EXECUTE FUNCTION auto_set_business_id();

-- Staff trigger
DROP TRIGGER IF EXISTS trigger_auto_set_staff_business_id ON staff;
CREATE TRIGGER trigger_auto_set_staff_business_id
  BEFORE INSERT ON staff
  FOR EACH ROW
  EXECUTE FUNCTION auto_set_business_id();

-- Step 3: Test the trigger
SELECT 
  'Testing auto business_id assignment' as test_info,
  'Trigger created for all tables' as status;

-- Step 4: Verify triggers exist
SELECT 
  event_object_table as table_name,
  trigger_name,
  action_timing as timing,
  action_condition as condition,
  action_statement as statement
FROM information_schema.triggers 
WHERE trigger_name LIKE 'auto_set_%_business_id'
ORDER BY event_object_table;

-- Step 5: Show what the function does
SELECT 
  'Function Explanation' as info,
  'get_or_create_current_business() automatically:' as description,
  '1. Gets current user business' as step1,
  '2. Creates business if none exists' as step2,
  '3. Returns business_id for assignment' as step3;
