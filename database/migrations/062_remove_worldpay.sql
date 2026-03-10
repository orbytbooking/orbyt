-- Remove Worldpay payment provider
-- Migrate any businesses using worldpay to stripe
UPDATE public.businesses
SET payment_provider = 'stripe'
WHERE payment_provider = 'worldpay';

-- Drop Worldpay from constraint
ALTER TABLE public.businesses
DROP CONSTRAINT IF EXISTS businesses_payment_provider_check;

ALTER TABLE public.businesses
ADD CONSTRAINT businesses_payment_provider_check
CHECK (payment_provider IN ('stripe', 'authorize_net'));

-- Drop worldpay_merchant_id column
ALTER TABLE public.businesses
DROP COLUMN IF EXISTS worldpay_merchant_id;
