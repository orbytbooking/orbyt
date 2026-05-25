-- Persist advanced coupon targeting/configuration from admin marketing form.

ALTER TABLE public.marketing_coupons
  ADD COLUMN IF NOT EXISTS coupon_config jsonb NOT NULL DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.marketing_coupons.coupon_config IS 'UI configuration for coupon targeting (industries, toggles, locations, services, etc.).';
