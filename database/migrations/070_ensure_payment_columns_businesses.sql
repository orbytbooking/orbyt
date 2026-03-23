-- Ensure all payment gateway columns exist on businesses (safe to run multiple times).
-- Run this in Supabase SQL Editor if payment-settings PATCH returns 500 (e.g. column does not exist).

-- payment_provider (from 056)
ALTER TABLE public.businesses
ADD COLUMN IF NOT EXISTS payment_provider text NOT NULL DEFAULT 'stripe';

-- Authorize.net (from 061)
ALTER TABLE public.businesses
ADD COLUMN IF NOT EXISTS authorize_net_api_login_id text;

ALTER TABLE public.businesses
ADD COLUMN IF NOT EXISTS authorize_net_transaction_key text;

-- Stripe keys and toggles (from 064)
ALTER TABLE public.businesses
ADD COLUMN IF NOT EXISTS stripe_publishable_key text;

ALTER TABLE public.businesses
ADD COLUMN IF NOT EXISTS stripe_secret_key text;

ALTER TABLE public.businesses
ADD COLUMN IF NOT EXISTS stripe_3ds_enabled boolean DEFAULT true;

ALTER TABLE public.businesses
ADD COLUMN IF NOT EXISTS stripe_billing_address_enabled boolean DEFAULT false;

-- Constraint for payment_provider (allow stripe + authorize_net)
ALTER TABLE public.businesses
DROP CONSTRAINT IF EXISTS businesses_payment_provider_check;

ALTER TABLE public.businesses
ADD CONSTRAINT businesses_payment_provider_check
CHECK (payment_provider IN ('stripe', 'authorize_net'));
