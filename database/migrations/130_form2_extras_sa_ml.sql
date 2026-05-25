-- Form 2 add-ons: optional merchant-location (M.L.) price and duration (S.A. stays on price / time_minutes).
ALTER TABLE public.industry_extras
  ADD COLUMN IF NOT EXISTS price_merchant_location numeric,
  ADD COLUMN IF NOT EXISTS time_minutes_merchant_location integer;

COMMENT ON COLUMN public.industry_extras.price_merchant_location IS
  'Form 2 listing_kind addon: M.L. price; NULL = same as service-area (S.A.) price.';
COMMENT ON COLUMN public.industry_extras.time_minutes_merchant_location IS
  'Form 2 listing_kind addon: M.L. duration in minutes; NULL = same as S.A. time_minutes.';
