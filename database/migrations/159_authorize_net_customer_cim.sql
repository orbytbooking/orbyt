-- Authorize.Net CIM fields for tenant customer cards + Accept.js public client key on businesses.

ALTER TABLE public.businesses
ADD COLUMN IF NOT EXISTS authorize_net_public_client_key text;

COMMENT ON COLUMN public.businesses.authorize_net_public_client_key IS
  'Authorize.Net Public Client Key for Accept.js when payment_provider is authorize_net';

ALTER TABLE public.customers
ADD COLUMN IF NOT EXISTS authorize_net_customer_profile_id text;

COMMENT ON COLUMN public.customers.authorize_net_customer_profile_id IS
  'Authorize.Net CIM customer profile id for vaulted cards on this customer';
