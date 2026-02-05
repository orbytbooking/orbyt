-- Create a function that automatically creates a customer record when a user signs up
CREATE OR REPLACE FUNCTION public.handle_new_customer_user()
RETURNS TRIGGER AS $$
DECLARE
  default_business_id uuid;
BEGIN
  -- Only proceed if the user has role 'customer' in metadata
  IF NEW.raw_user_meta_data->>'role' = 'customer' THEN
    -- Get the first active business (you can modify this logic as needed)
    SELECT id INTO default_business_id
    FROM public.businesses
    WHERE is_active = true
    LIMIT 1;

    -- Insert the customer record
    INSERT INTO public.customers (
      auth_user_id,
      email,
      name,
      phone,
      address,
      business_id,
      status,
      avatar,
      email_notifications,
      sms_notifications,
      push_notifications
    ) VALUES (
      NEW.id,
      NEW.email,
      COALESCE(NEW.raw_user_meta_data->>'full_name', 'Customer'),
      COALESCE(NEW.raw_user_meta_data->>'phone', ''),
      COALESCE(NEW.raw_user_meta_data->>'address', ''),
      default_business_id,
      'active',
      NULL,
      true,
      true,
      true
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create the trigger
DROP TRIGGER IF EXISTS on_auth_user_created_customer ON auth.users;
CREATE TRIGGER on_auth_user_created_customer
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_customer_user();
