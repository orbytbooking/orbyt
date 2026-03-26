-- Persist coupon metadata on bookings for reliable reporting/auditing.

ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS coupon_code text,
  ADD COLUMN IF NOT EXISTS coupon_mode text,
  ADD COLUMN IF NOT EXISTS coupon_discount_type text CHECK (coupon_discount_type = ANY (ARRAY['fixed'::text, 'percentage'::text])),
  ADD COLUMN IF NOT EXISTS coupon_discount_value numeric,
  ADD COLUMN IF NOT EXISTS coupon_discount_amount numeric;

COMMENT ON COLUMN public.bookings.coupon_code IS 'Applied coupon code (if any) at booking time.';
COMMENT ON COLUMN public.bookings.coupon_mode IS 'How coupon was applied: coupon-code, amount, or percent.';
COMMENT ON COLUMN public.bookings.coupon_discount_type IS 'Coupon discount type: fixed or percentage.';
COMMENT ON COLUMN public.bookings.coupon_discount_value IS 'Coupon value entered/configured (amount or percent).';
COMMENT ON COLUMN public.bookings.coupon_discount_amount IS 'Final discount amount applied to this booking.';
