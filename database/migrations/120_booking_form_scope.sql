-- Isolate Form 1 vs Form 2 booking configuration rows (frequencies, categories, packages, variables, extras/addons).
ALTER TABLE public.industry_frequency
  ADD COLUMN IF NOT EXISTS booking_form_scope text NOT NULL DEFAULT 'form1';

ALTER TABLE public.industry_frequency
  DROP CONSTRAINT IF EXISTS industry_frequency_booking_form_scope_check;
ALTER TABLE public.industry_frequency
  ADD CONSTRAINT industry_frequency_booking_form_scope_check
  CHECK (booking_form_scope = ANY (ARRAY['form1'::text, 'form2'::text]));

COMMENT ON COLUMN public.industry_frequency.booking_form_scope IS
  'Which booking form this frequency belongs to: form1 (classic) or form2 (long-scroll layout).';

ALTER TABLE public.industry_service_category
  ADD COLUMN IF NOT EXISTS booking_form_scope text NOT NULL DEFAULT 'form1';

ALTER TABLE public.industry_service_category
  DROP CONSTRAINT IF EXISTS industry_service_category_booking_form_scope_check;
ALTER TABLE public.industry_service_category
  ADD CONSTRAINT industry_service_category_booking_form_scope_check
  CHECK (booking_form_scope = ANY (ARRAY['form1'::text, 'form2'::text]));

COMMENT ON COLUMN public.industry_service_category.booking_form_scope IS
  'Which booking form this service category belongs to.';

ALTER TABLE public.industry_pricing_parameter
  ADD COLUMN IF NOT EXISTS booking_form_scope text NOT NULL DEFAULT 'form1';

ALTER TABLE public.industry_pricing_parameter
  DROP CONSTRAINT IF EXISTS industry_pricing_parameter_booking_form_scope_check;
ALTER TABLE public.industry_pricing_parameter
  ADD CONSTRAINT industry_pricing_parameter_booking_form_scope_check
  CHECK (booking_form_scope = ANY (ARRAY['form1'::text, 'form2'::text]));

COMMENT ON COLUMN public.industry_pricing_parameter.booking_form_scope IS
  'Which booking form these packages/pricing parameters belong to.';

ALTER TABLE public.industry_pricing_variable
  ADD COLUMN IF NOT EXISTS booking_form_scope text NOT NULL DEFAULT 'form1';

ALTER TABLE public.industry_pricing_variable
  DROP CONSTRAINT IF EXISTS industry_pricing_variable_booking_form_scope_check;
ALTER TABLE public.industry_pricing_variable
  ADD CONSTRAINT industry_pricing_variable_booking_form_scope_check
  CHECK (booking_form_scope = ANY (ARRAY['form1'::text, 'form2'::text]));

COMMENT ON COLUMN public.industry_pricing_variable.booking_form_scope IS
  'Which booking form these items/variable categories belong to.';

ALTER TABLE public.industry_extras
  ADD COLUMN IF NOT EXISTS booking_form_scope text NOT NULL DEFAULT 'form1';

ALTER TABLE public.industry_extras
  DROP CONSTRAINT IF EXISTS industry_extras_booking_form_scope_check;
ALTER TABLE public.industry_extras
  ADD CONSTRAINT industry_extras_booking_form_scope_check
  CHECK (booking_form_scope = ANY (ARRAY['form1'::text, 'form2'::text]));

ALTER TABLE public.industry_extras
  ADD COLUMN IF NOT EXISTS listing_kind text NOT NULL DEFAULT 'extra';

ALTER TABLE public.industry_extras
  DROP CONSTRAINT IF EXISTS industry_extras_listing_kind_check;
ALTER TABLE public.industry_extras
  ADD CONSTRAINT industry_extras_listing_kind_check
  CHECK (listing_kind = ANY (ARRAY['extra'::text, 'addon'::text]));

COMMENT ON COLUMN public.industry_extras.booking_form_scope IS
  'Which booking form this row belongs to.';
COMMENT ON COLUMN public.industry_extras.listing_kind IS
  'Admin list: extra (standard upsell) vs addon (package add-on).';

CREATE INDEX IF NOT EXISTS idx_industry_frequency_industry_scope
  ON public.industry_frequency (industry_id, business_id, booking_form_scope);
CREATE INDEX IF NOT EXISTS idx_industry_service_category_industry_scope
  ON public.industry_service_category (industry_id, business_id, booking_form_scope);
CREATE INDEX IF NOT EXISTS idx_industry_pricing_parameter_industry_scope
  ON public.industry_pricing_parameter (industry_id, business_id, booking_form_scope);
CREATE INDEX IF NOT EXISTS idx_industry_pricing_variable_industry_scope
  ON public.industry_pricing_variable (industry_id, business_id, booking_form_scope);
CREATE INDEX IF NOT EXISTS idx_industry_extras_industry_scope_kind
  ON public.industry_extras (industry_id, business_id, booking_form_scope, listing_kind);
