-- Stripe API keys per business (optional; when set, used instead of Stripe Connect)
-- and toggles for 3DS and billing address (Booking Koala style)

ALTER TABLE public.businesses
ADD COLUMN IF NOT EXISTS stripe_publishable_key text;

ALTER TABLE public.businesses
ADD COLUMN IF NOT EXISTS stripe_secret_key text;

ALTER TABLE public.businesses
ADD COLUMN IF NOT EXISTS stripe_3ds_enabled boolean DEFAULT true;

ALTER TABLE public.businesses
ADD COLUMN IF NOT EXISTS stripe_billing_address_enabled boolean DEFAULT false;

COMMENT ON COLUMN public.businesses.stripe_publishable_key IS 'Stripe publishable key when using key-based Stripe (per business)';
COMMENT ON COLUMN public.businesses.stripe_secret_key IS 'Stripe secret key when using key-based Stripe (per business)';
COMMENT ON COLUMN public.businesses.stripe_3ds_enabled IS 'Enable 3DS (Strong Customer Authentication) for Stripe';
COMMENT ON COLUMN public.businesses.stripe_billing_address_enabled IS 'Collect billing address with card for Stripe';
