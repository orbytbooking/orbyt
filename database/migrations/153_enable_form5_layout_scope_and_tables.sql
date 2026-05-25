-- Enable Form 5 support in DB schema.
-- Adds form5 to layout/scope constraints and provisions dedicated Form 5 tables.

BEGIN;

-- 1) Extend layout constraint to include form5.
ALTER TABLE public.industries
  DROP CONSTRAINT IF EXISTS industries_customer_booking_form_layout_check;
ALTER TABLE public.industries
  ADD CONSTRAINT industries_customer_booking_form_layout_check
  CHECK (
    customer_booking_form_layout = ANY (
      ARRAY['form1'::text, 'form2'::text, 'form3'::text, 'form4'::text, 'form5'::text
      ]
    )
  );

COMMENT ON COLUMN public.industries.customer_booking_form_layout IS
  'Customer book-now layout: form1 (steps), form2 (single page), form3 (items + add-ons), form4 (unit-based pricing), form5 (hourly service categories).';

-- 2) Extend base booking_form_scope constraints to include form5.
ALTER TABLE public.industry_frequency
  DROP CONSTRAINT IF EXISTS industry_frequency_booking_form_scope_check;
ALTER TABLE public.industry_frequency
  ADD CONSTRAINT industry_frequency_booking_form_scope_check
  CHECK (
    booking_form_scope = ANY (
      ARRAY['form1'::text, 'form2'::text, 'form3'::text, 'form4'::text, 'form5'::text]
    )
  );

ALTER TABLE public.industry_service_category
  DROP CONSTRAINT IF EXISTS industry_service_category_booking_form_scope_check;
ALTER TABLE public.industry_service_category
  ADD CONSTRAINT industry_service_category_booking_form_scope_check
  CHECK (
    booking_form_scope = ANY (
      ARRAY['form1'::text, 'form2'::text, 'form3'::text, 'form4'::text, 'form5'::text]
    )
  );

ALTER TABLE public.industry_pricing_parameter
  DROP CONSTRAINT IF EXISTS industry_pricing_parameter_booking_form_scope_check;
ALTER TABLE public.industry_pricing_parameter
  ADD CONSTRAINT industry_pricing_parameter_booking_form_scope_check
  CHECK (
    booking_form_scope = ANY (
      ARRAY['form1'::text, 'form2'::text, 'form3'::text, 'form4'::text, 'form5'::text]
    )
  );

ALTER TABLE public.industry_pricing_variable
  DROP CONSTRAINT IF EXISTS industry_pricing_variable_booking_form_scope_check;
ALTER TABLE public.industry_pricing_variable
  ADD CONSTRAINT industry_pricing_variable_booking_form_scope_check
  CHECK (
    booking_form_scope = ANY (
      ARRAY['form1'::text, 'form2'::text, 'form3'::text, 'form4'::text, 'form5'::text]
    )
  );

ALTER TABLE public.industry_extras
  DROP CONSTRAINT IF EXISTS industry_extras_booking_form_scope_check;
ALTER TABLE public.industry_extras
  ADD CONSTRAINT industry_extras_booking_form_scope_check
  CHECK (
    booking_form_scope = ANY (
      ARRAY['form1'::text, 'form2'::text, 'form3'::text, 'form4'::text, 'form5'::text]
    )
  );

-- 3) Create dedicated Form 5 tables.
CREATE TABLE IF NOT EXISTS public.industry_form5_frequencies
(LIKE public.industry_frequency INCLUDING DEFAULTS INCLUDING CONSTRAINTS INCLUDING INDEXES);

CREATE TABLE IF NOT EXISTS public.industry_form5_service_categories
(LIKE public.industry_service_category INCLUDING DEFAULTS INCLUDING CONSTRAINTS INCLUDING INDEXES);

CREATE TABLE IF NOT EXISTS public.industry_form5_pricing_parameters
(LIKE public.industry_pricing_parameter INCLUDING DEFAULTS INCLUDING CONSTRAINTS INCLUDING INDEXES);

CREATE TABLE IF NOT EXISTS public.industry_form5_variables
(LIKE public.industry_pricing_variable INCLUDING DEFAULTS INCLUDING CONSTRAINTS INCLUDING INDEXES);

CREATE TABLE IF NOT EXISTS public.industry_form5_extras
(LIKE public.industry_extras INCLUDING DEFAULTS INCLUDING CONSTRAINTS INCLUDING INDEXES);

-- 4) Backfill any existing rows already tagged with form5 in base tables.
INSERT INTO public.industry_form5_frequencies
SELECT * FROM public.industry_frequency
WHERE booking_form_scope = 'form5'
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.industry_form5_service_categories
SELECT * FROM public.industry_service_category
WHERE booking_form_scope = 'form5'
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.industry_form5_pricing_parameters
SELECT * FROM public.industry_pricing_parameter
WHERE booking_form_scope = 'form5'
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.industry_form5_variables
SELECT * FROM public.industry_pricing_variable
WHERE booking_form_scope = 'form5'
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.industry_form5_extras
SELECT * FROM public.industry_extras
WHERE booking_form_scope = 'form5'
ON CONFLICT (id) DO NOTHING;

COMMIT;
