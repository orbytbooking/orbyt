-- SaaS Business Creation System
-- This allows automatic business creation with proper multi-tenant isolation

-- Step 1: Create function to automatically create business for new users
CREATE OR REPLACE FUNCTION create_business_for_user(
  user_email TEXT,
  business_name TEXT DEFAULT NULL,
  business_category TEXT DEFAULT 'General Services'
)
RETURNS UUID AS $$
DECLARE
  new_business_id UUID;
  user_id UUID;
BEGIN
  -- Get the user ID from email
  SELECT id INTO user_id FROM auth.users WHERE email = user_email;
  
  IF user_id IS NULL THEN
    RAISE EXCEPTION 'User not found: %', user_email;
  END IF;
  
  -- Check if user already has a business
  SELECT id INTO new_business_id FROM businesses WHERE owner_id = user_id;
  
  IF new_business_id IS NOT NULL THEN
    -- User already has a business, return existing
    RETURN new_business_id;
  END IF;
  
  -- Create new business
  INSERT INTO businesses (
    name, 
    category, 
    owner_id,
    plan,
    is_active
  ) VALUES (
    COALESCE(business_name, split_part(user_email, '@', 1) || ' Business'),
    business_category,
    user_id,
    'starter',
    true
  ) RETURNING id INTO new_business_id;
  
  -- Create default services for the new business
  INSERT INTO services (business_id, name, base_price, duration_hours, service_type) VALUES
    (new_business_id, 'Standard Service', 100.00, 1, 'service'),
    (new_business_id, 'Premium Service', 200.00, 2, 'service'),
    (new_business_id, 'Consultation', 50.00, 1, 'consultation');
  
  RETURN new_business_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 2: Create trigger to automatically create business on user signup
CREATE OR REPLACE FUNCTION auto_create_business_on_signup()
RETURNS TRIGGER AS $$
BEGIN
  -- Only create business if user is authenticated and doesn't already have one
  IF NEW.email IS NOT NULL AND NEW.id IS NOT NULL THEN
    -- Check if user already has a business
    IF NOT EXISTS (SELECT 1 FROM businesses WHERE owner_id = NEW.id) THEN
      -- Create default business for new user
      INSERT INTO businesses (
        name, 
        category, 
        owner_id,
        plan,
        is_active
      ) VALUES (
        split_part(NEW.email, '@', 1) || ' Business',
        'General Services',
        NEW.id,
        'starter',
        true
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 3: Create trigger on auth.users for automatic business creation
DROP TRIGGER IF EXISTS trigger_auto_create_business ON auth.users;
CREATE TRIGGER trigger_auto_create_business
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION auto_create_business_on_signup();

-- Step 4: Create API endpoint helper function
CREATE OR REPLACE FUNCTION get_or_create_current_business()
RETURNS UUID AS $$
DECLARE
  current_business_id UUID;
  current_user_id UUID;
BEGIN
  -- Get current user ID
  current_user_id := auth.uid();
  
  -- If no authenticated user, return error
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'No authenticated user found';
  END IF;
  
  -- Get current user's business
  SELECT id INTO current_business_id 
  FROM businesses 
  WHERE owner_id = current_user_id;
  
  -- If no business exists, create one
  IF current_business_id IS NULL THEN
    current_business_id := create_business_for_user(
      (SELECT email FROM auth.users WHERE id = current_user_id),
      NULL,
      'General Services'
    );
  END IF;
  
  RETURN current_business_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 5: Update RLS policies to use the helper function
-- This ensures users always have access to their own business data
DO $$
BEGIN
  -- Update customers policies
  DROP POLICY IF EXISTS "Business users can view their own customers" ON customers;
  CREATE POLICY "Business users can view their own customers" ON customers
    FOR SELECT USING (business_id = get_or_create_current_business());

  DROP POLICY IF EXISTS "Business users can insert their own customers" ON customers;
  CREATE POLICY "Business users can insert their own customers" ON customers
    FOR INSERT WITH CHECK (business_id = get_or_create_current_business());

  DROP POLICY IF EXISTS "Business users can update their own customers" ON customers;
  CREATE POLICY "Business users can update their own customers" ON customers
    FOR UPDATE USING (business_id = get_or_create_current_business());

  DROP POLICY IF EXISTS "Business users can delete their own customers" ON customers;
  CREATE POLICY "Business users can delete their own customers" ON customers
    FOR DELETE USING (business_id = get_or_create_current_business());
    
  -- Update bookings policies
  DROP POLICY IF EXISTS "Business users can view their own bookings" ON bookings;
  CREATE POLICY "Business users can view their own bookings" ON bookings
    FOR SELECT USING (business_id = get_or_create_current_business());

  DROP POLICY IF EXISTS "Business users can insert their own bookings" ON bookings;
  CREATE POLICY "Business users can insert their own bookings" ON bookings
    FOR INSERT WITH CHECK (business_id = get_or_create_current_business());

  DROP POLICY IF EXISTS "Business users can update their own bookings" ON bookings;
  CREATE POLICY "Business users can update their own bookings" ON bookings
    FOR UPDATE USING (business_id = get_or_create_current_business());

  DROP POLICY IF EXISTS "Business users can delete their own bookings" ON bookings;
  CREATE POLICY "Business users can delete their own bookings" ON bookings
    FOR DELETE USING (business_id = get_or_create_current_business());
    
  -- Update services policies
  DROP POLICY IF EXISTS "Business users can view their own services" ON services;
  CREATE POLICY "Business users can view their own services" ON services
    FOR SELECT USING (business_id = get_or_create_current_business());

  DROP POLICY IF EXISTS "Business users can insert their own services" ON services;
  CREATE POLICY "Business users can insert their own services" ON services
    FOR INSERT WITH CHECK (business_id = get_or_create_current_business());

  DROP POLICY IF EXISTS "Business users can update their own services" ON services;
  CREATE POLICY "Business users can update their own services" ON services
    FOR UPDATE USING (business_id = get_or_create_current_business());

  DROP POLICY IF EXISTS "Business users can delete their own services" ON services;
  CREATE POLICY "Business users can delete their own services" ON services
    FOR DELETE USING (business_id = get_or_create_current_business());
END $$;

-- Step 6: Create view for easy business management
CREATE OR REPLACE VIEW user_business AS
SELECT 
  b.*,
  CASE 
    WHEN b.owner_id = auth.uid() THEN 'OWN_BUSINESS'
    ELSE 'OTHER_BUSINESS'
  END as access_level
FROM businesses b
WHERE b.owner_id = auth.uid();

-- Step 7: Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON businesses TO authenticated;
GRANT ALL ON customers TO authenticated;
GRANT ALL ON bookings TO authenticated;
GRANT ALL ON services TO authenticated;
GRANT ALL ON profiles TO authenticated;
GRANT ALL ON leads TO authenticated;
GRANT ALL ON coupons TO authenticated;
GRANT ALL ON service_providers TO authenticated;
GRANT ALL ON provider_availability TO authenticated;
GRANT ALL ON staff TO authenticated;

-- Comments
COMMENT ON FUNCTION create_business_for_user IS 'Creates a business for a user with default services';
COMMENT ON FUNCTION get_or_create_current_business IS 'Gets or creates the current user''s business automatically';
COMMENT ON VIEW user_business IS 'View for users to see their own business information';
