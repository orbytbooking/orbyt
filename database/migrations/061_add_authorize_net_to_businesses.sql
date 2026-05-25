-- Add Authorize.net as payment provider option
-- Each business can connect their own Authorize.net account (API Login ID + Transaction Key)

ALTER TABLE public.businesses
ADD COLUMN IF NOT EXISTS authorize_net_api_login_id text;

ALTER TABLE public.businesses
ADD COLUMN IF NOT EXISTS authorize_net_transaction_key text;

COMMENT ON COLUMN public.businesses.authorize_net_api_login_id IS 'Authorize.net API Login ID when payment_provider is authorize_net (per business)';
COMMENT ON COLUMN public.businesses.authorize_net_transaction_key IS 'Authorize.net Transaction Key when payment_provider is authorize_net (per business)';

-- Extend payment_provider constraint to include authorize_net
ALTER TABLE public.businesses
DROP CONSTRAINT IF EXISTS businesses_payment_provider_check;

ALTER TABLE public.businesses
ADD CONSTRAINT businesses_payment_provider_check
CHECK (payment_provider IN ('stripe', 'worldpay', 'authorize_net'));
