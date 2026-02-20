-- Add access_blocked and booking_blocked to customers (for admin action buttons)
-- email_notifications may already exist from customer auth setup; add if missing for Subscribe/Unsubscribe
ALTER TABLE public.customers
ADD COLUMN IF NOT EXISTS access_blocked boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS booking_blocked boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS email_notifications boolean DEFAULT true;

COMMENT ON COLUMN public.customers.access_blocked IS 'When true, customer access can be restricted (e.g. login or portal)';
COMMENT ON COLUMN public.customers.booking_blocked IS 'When true, customer cannot create new bookings';
