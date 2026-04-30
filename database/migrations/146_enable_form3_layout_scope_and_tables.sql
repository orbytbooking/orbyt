-- Re-enable Form 3 support (rolled back in 143) and provision dedicated Form 3 tables.
BEGIN;

ALTER TABLE public.industries
  DROP CONSTRAINT IF EXISTS industries_customer_booking_form_layout_check;
ALTER TABLE public.industries
  ADD CONSTRAINT industries_customer_booking_form_layout_check
  CHECK (customer_booking_form_layout = ANY (ARRAY['form1'::text, 'form2'::text, 'form3'::text]));

COMMENT ON COLUMN public.industries.customer_booking_form_layout IS
  'Customer book-now layout for this industry: form1 (multi-step), form2 (single page + sidebar), or form3 (items + add-ons).';

ALTER TABLE public.industry_frequency
  DROP CONSTRAINT IF EXISTS industry_frequency_booking_form_scope_check;
ALTER TABLE public.industry_frequency
  ADD CONSTRAINT industry_frequency_booking_form_scope_check
  CHECK (booking_form_scope = ANY (ARRAY['form1'::text, 'form2'::text, 'form3'::text]));

ALTER TABLE public.industry_service_category
  DROP CONSTRAINT IF EXISTS industry_service_category_booking_form_scope_check;
ALTER TABLE public.industry_service_category
  ADD CONSTRAINT industry_service_category_booking_form_scope_check
  CHECK (booking_form_scope = ANY (ARRAY['form1'::text, 'form2'::text, 'form3'::text]));

ALTER TABLE public.industry_pricing_parameter
  DROP CONSTRAINT IF EXISTS industry_pricing_parameter_booking_form_scope_check;
ALTER TABLE public.industry_pricing_parameter
  ADD CONSTRAINT industry_pricing_parameter_booking_form_scope_check
  CHECK (booking_form_scope = ANY (ARRAY['form1'::text, 'form2'::text, 'form3'::text]));

ALTER TABLE public.industry_pricing_variable
  DROP CONSTRAINT IF EXISTS industry_pricing_variable_booking_form_scope_check;
ALTER TABLE public.industry_pricing_variable
  ADD CONSTRAINT industry_pricing_variable_booking_form_scope_check
  CHECK (booking_form_scope = ANY (ARRAY['form1'::text, 'form2'::text, 'form3'::text]));

ALTER TABLE public.industry_extras
  DROP CONSTRAINT IF EXISTS industry_extras_booking_form_scope_check;
ALTER TABLE public.industry_extras
  ADD CONSTRAINT industry_extras_booking_form_scope_check
  CHECK (booking_form_scope = ANY (ARRAY['form1'::text, 'form2'::text, 'form3'::text]));

CREATE TABLE IF NOT EXISTS public.industry_form3_frequencies
(LIKE public.industry_frequency INCLUDING DEFAULTS INCLUDING CONSTRAINTS INCLUDING INDEXES);

CREATE TABLE IF NOT EXISTS public.industry_form3_service_categories
(LIKE public.industry_service_category INCLUDING DEFAULTS INCLUDING CONSTRAINTS INCLUDING INDEXES);

CREATE TABLE IF NOT EXISTS public.industry_form3_items
(LIKE public.industry_pricing_variable INCLUDING DEFAULTS INCLUDING CONSTRAINTS INCLUDING INDEXES);

CREATE TABLE IF NOT EXISTS public.industry_form3_extras
(LIKE public.industry_extras INCLUDING DEFAULTS INCLUDING CONSTRAINTS INCLUDING INDEXES);

CREATE TABLE IF NOT EXISTS public.industry_form3_addons
(LIKE public.industry_extras INCLUDING DEFAULTS INCLUDING CONSTRAINTS INCLUDING INDEXES);

INSERT INTO public.industry_form3_frequencies
SELECT * FROM public.industry_frequency
WHERE booking_form_scope = 'form3'
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.industry_form3_service_categories
SELECT * FROM public.industry_service_category
WHERE booking_form_scope = 'form3'
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.industry_form3_items
SELECT * FROM public.industry_pricing_variable
WHERE booking_form_scope = 'form3'
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.industry_form3_extras
SELECT * FROM public.industry_extras
WHERE booking_form_scope = 'form3'
  AND listing_kind <> 'addon'
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.industry_form3_addons
SELECT * FROM public.industry_extras
WHERE booking_form_scope = 'form3'
  AND listing_kind = 'addon'
ON CONFLICT (id) DO NOTHING;

COMMIT;
