-- Settings > General > Admin tab: gift card limits, referral credits, payment descriptions
ALTER TABLE public.business_store_options
  ADD COLUMN IF NOT EXISTS gift_card_min_amount numeric(12, 2) NOT NULL DEFAULT 150.00,
  ADD COLUMN IF NOT EXISTS gift_card_allow_edit_below_min boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS gift_card_max_limit_enabled boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS gift_card_max_amount numeric(12, 2),
  ADD COLUMN IF NOT EXISTS referral_credit_referred numeric(12, 2) NOT NULL DEFAULT 50.00,
  ADD COLUMN IF NOT EXISTS referral_credit_referrer numeric(12, 2) NOT NULL DEFAULT 50.00,
  ADD COLUMN IF NOT EXISTS payment_card_hold_description text,
  ADD COLUMN IF NOT EXISTS payment_charge_booking_description text,
  ADD COLUMN IF NOT EXISTS payment_separate_charge_description text,
  ADD COLUMN IF NOT EXISTS payment_charge_invoice_description text;

COMMENT ON COLUMN public.business_store_options.gift_card_min_amount IS 'Minimum purchase amount for gift cards';
COMMENT ON COLUMN public.business_store_options.gift_card_allow_edit_below_min IS 'When true, admins may reduce a gift card below the minimum';
COMMENT ON COLUMN public.business_store_options.gift_card_max_limit_enabled IS 'When true, gift_card_max_amount caps purchases';
COMMENT ON COLUMN public.business_store_options.gift_card_max_amount IS 'Maximum gift card purchase when max limit enabled';
COMMENT ON COLUMN public.business_store_options.referral_credit_referred IS 'Credit for the new customer who was referred';
COMMENT ON COLUMN public.business_store_options.referral_credit_referrer IS 'Credit for the customer who referred someone';
