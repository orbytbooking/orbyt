-- Store Stripe Connect (Express) account id for receiving payments
ALTER TABLE public.businesses
ADD COLUMN IF NOT EXISTS stripe_connect_account_id text;

COMMENT ON COLUMN public.businesses.stripe_connect_account_id IS 'Stripe Connect Express account id; when set, customer payments can be routed to this account.';
