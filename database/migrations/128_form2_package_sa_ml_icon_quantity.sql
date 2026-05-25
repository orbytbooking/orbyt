-- Form 2 packages: merchant-location price/time, quantity flag, optional icon (S.A. uses existing price + time_minutes).

ALTER TABLE public.industry_pricing_parameter
  ADD COLUMN IF NOT EXISTS price_merchant_location numeric NULL,
  ADD COLUMN IF NOT EXISTS time_minutes_merchant_location integer NULL,
  ADD COLUMN IF NOT EXISTS quantity_based boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS icon text NULL;

COMMENT ON COLUMN public.industry_pricing_parameter.price IS
  'Base price; for booking_form_scope form2 this is the service area (S.A.) price.';
COMMENT ON COLUMN public.industry_pricing_parameter.time_minutes IS
  'Duration in minutes; for booking_form_scope form2 this is the service area (S.A.) time.';
COMMENT ON COLUMN public.industry_pricing_parameter.price_merchant_location IS
  'Form 2 merchant location (M.L.) price; NULL means same as service area until set.';
COMMENT ON COLUMN public.industry_pricing_parameter.time_minutes_merchant_location IS
  'Form 2 merchant location (M.L.) duration in minutes; NULL means same as service area until set.';
COMMENT ON COLUMN public.industry_pricing_parameter.quantity_based IS
  'Form 2: when true, package is sold by quantity (UI/book-now wiring may follow).';
COMMENT ON COLUMN public.industry_pricing_parameter.icon IS
  'Optional preset icon name or image URL/data URL for Form 2 package card.';
