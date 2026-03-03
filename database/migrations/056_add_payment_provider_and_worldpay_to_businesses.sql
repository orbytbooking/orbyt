-- Let business owners choose payment provider: Stripe or Worldpay
ALTER TABLE public.businesses
ADD COLUMN IF NOT EXISTS payment_provider text NOT NULL DEFAULT 'stripe';

ALTER TABLE public.businesses
ADD COLUMN IF NOT EXISTS worldpay_merchant_id text;

COMMENT ON COLUMN public.businesses.payment_provider IS 'Which payment gateway to use: stripe | worldpay';
COMMENT ON COLUMN public.businesses.worldpay_merchant_id IS 'Worldpay merchant ID when payment_provider is worldpay (optional; platform Worldpay used if null)';

-- Constrain allowed values
ALTER TABLE public.businesses
DROP CONSTRAINT IF EXISTS businesses_payment_provider_check;

ALTER TABLE public.businesses
ADD CONSTRAINT businesses_payment_provider_check
CHECK (payment_provider IN ('stripe', 'worldpay'));
