-- Manual vs multiply quantity-based extra pricing (tiers vs per-unit × qty)

ALTER TABLE public.industry_extras
  ADD COLUMN IF NOT EXISTS pricing_structure text NOT NULL DEFAULT 'multiply'
    CHECK (pricing_structure = ANY (ARRAY['multiply'::text, 'manual'::text]));

ALTER TABLE public.industry_extras
  ADD COLUMN IF NOT EXISTS manual_prices jsonb NOT NULL DEFAULT '[]'::jsonb;

COMMENT ON COLUMN public.industry_extras.pricing_structure IS 'multiply: price and time_minutes are per unit; total = × quantity. manual: use manual_prices tiers (index i = quantity i+1).';
COMMENT ON COLUMN public.industry_extras.manual_prices IS 'JSON array [{price, time_minutes}, ...]; tier at index q-1 is the total line for quantity q.';
