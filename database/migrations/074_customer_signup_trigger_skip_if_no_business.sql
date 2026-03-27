-- Applies only to **customer** signups (raw_user_meta_data.role = 'customer'), e.g. booking app end-users.
-- Business-owner onboarding uses role = 'owner' and does not enter this function's customer branch.
--
-- Prevents auth.users INSERT from failing when role=customer but no active business exists
-- (customers.business_id NOT NULL + no rows in businesses with is_active = true → trigger error).

CREATE OR REPLACE FUNCTION public.handle_new_customer_user()
RETURNS TRIGGER AS $$
DECLARE
  default_business_id uuid;
BEGIN
  IF NEW.raw_user_meta_data->>'role' = 'customer' THEN
    SELECT id INTO default_business_id
    FROM public.businesses
    WHERE is_active = true
    LIMIT 1;

    -- No business to attach yet; do not fail user signup
    IF default_business_id IS NULL THEN
      RETURN NEW;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM public.customers WHERE auth_user_id = NEW.id) THEN
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
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
