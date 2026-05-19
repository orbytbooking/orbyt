-- Form 3 add-ons: per-item S.A. / M.L. price and time (keyed by item name in JSON).
ALTER TABLE public.industry_extras
  ADD COLUMN IF NOT EXISTS item_prices jsonb NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE public.industry_form3_addons
  ADD COLUMN IF NOT EXISTS item_prices jsonb NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE public.industry_form3_extras
  ADD COLUMN IF NOT EXISTS item_prices jsonb NOT NULL DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.industry_extras.item_prices IS
  'Form 3 add-on: map of item name → { price, time_minutes, price_merchant_location, time_minutes_merchant_location }.';
