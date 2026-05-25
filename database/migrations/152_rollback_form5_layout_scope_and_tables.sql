-- Roll back Form 5 support in DB schema.
-- This migration remaps Form 5 rows to Form 4, merges dedicated Form 5 table data
-- back into base tables, then drops Form 5-only tables and restores constraints.

BEGIN;

-- 1) Remap industry layout from form5 -> form4.
UPDATE public.industries
SET customer_booking_form_layout = 'form4'
WHERE customer_booking_form_layout = 'form5';

-- 2) Remap scope in base tables from form5 -> form4 before tightening constraints.
UPDATE public.industry_frequency
SET booking_form_scope = 'form4'
WHERE booking_form_scope = 'form5';

UPDATE public.industry_service_category
SET booking_form_scope = 'form4'
WHERE booking_form_scope = 'form5';

UPDATE public.industry_pricing_parameter
SET booking_form_scope = 'form4'
WHERE booking_form_scope = 'form5';

UPDATE public.industry_pricing_variable
SET booking_form_scope = 'form4'
WHERE booking_form_scope = 'form5';

UPDATE public.industry_extras
SET booking_form_scope = 'form4'
WHERE booking_form_scope = 'form5';

-- 3) Normalize dedicated Form 5 table rows to form4 and merge into base tables.
--    (Keeps data created while Form 5 was active.)
UPDATE public.industry_form5_frequencies
SET booking_form_scope = 'form4'
WHERE booking_form_scope = 'form5';

UPDATE public.industry_form5_service_categories
SET booking_form_scope = 'form4'
WHERE booking_form_scope = 'form5';

UPDATE public.industry_form5_pricing_parameters
SET booking_form_scope = 'form4'
WHERE booking_form_scope = 'form5';

UPDATE public.industry_form5_variables
SET booking_form_scope = 'form4'
WHERE booking_form_scope = 'form5';

UPDATE public.industry_form5_extras
SET booking_form_scope = 'form4'
WHERE booking_form_scope = 'form5';

INSERT INTO public.industry_frequency
SELECT * FROM public.industry_form5_frequencies
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.industry_service_category
SELECT * FROM public.industry_form5_service_categories
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.industry_pricing_parameter
SELECT * FROM public.industry_form5_pricing_parameters
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.industry_pricing_variable
SELECT * FROM public.industry_form5_variables
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.industry_extras
SELECT * FROM public.industry_form5_extras
ON CONFLICT (id) DO NOTHING;

-- 4) Drop dedicated Form 5 tables.
DROP TABLE IF EXISTS public.industry_form5_frequencies;
DROP TABLE IF EXISTS public.industry_form5_service_categories;
DROP TABLE IF EXISTS public.industry_form5_pricing_parameters;
DROP TABLE IF EXISTS public.industry_form5_variables;
DROP TABLE IF EXISTS public.industry_form5_extras;

-- 5) Restore layout/scope constraints to form1..form4.
ALTER TABLE public.industries
  DROP CONSTRAINT IF EXISTS industries_customer_booking_form_layout_check;
ALTER TABLE public.industries
  ADD CONSTRAINT industries_customer_booking_form_layout_check
  CHECK (customer_booking_form_layout = ANY (ARRAY['form1'::text, 'form2'::text, 'form3'::text, 'form4'::text]));

COMMENT ON COLUMN public.industries.customer_booking_form_layout IS
  'Customer book-now layout: form1 (steps), form2 (single page), form3 (items + add-ons), form4 (unit-based pricing parameters).';

ALTER TABLE public.industry_frequency
  DROP CONSTRAINT IF EXISTS industry_frequency_booking_form_scope_check;
ALTER TABLE public.industry_frequency
  ADD CONSTRAINT industry_frequency_booking_form_scope_check
  CHECK (booking_form_scope = ANY (ARRAY['form1'::text, 'form2'::text, 'form3'::text, 'form4'::text]));

ALTER TABLE public.industry_service_category
  DROP CONSTRAINT IF EXISTS industry_service_category_booking_form_scope_check;
ALTER TABLE public.industry_service_category
  ADD CONSTRAINT industry_service_category_booking_form_scope_check
  CHECK (booking_form_scope = ANY (ARRAY['form1'::text, 'form2'::text, 'form3'::text, 'form4'::text]));

ALTER TABLE public.industry_pricing_parameter
  DROP CONSTRAINT IF EXISTS industry_pricing_parameter_booking_form_scope_check;
ALTER TABLE public.industry_pricing_parameter
  ADD CONSTRAINT industry_pricing_parameter_booking_form_scope_check
  CHECK (booking_form_scope = ANY (ARRAY['form1'::text, 'form2'::text, 'form3'::text, 'form4'::text]));

ALTER TABLE public.industry_pricing_variable
  DROP CONSTRAINT IF EXISTS industry_pricing_variable_booking_form_scope_check;
ALTER TABLE public.industry_pricing_variable
  ADD CONSTRAINT industry_pricing_variable_booking_form_scope_check
  CHECK (booking_form_scope = ANY (ARRAY['form1'::text, 'form2'::text, 'form3'::text, 'form4'::text]));

ALTER TABLE public.industry_extras
  DROP CONSTRAINT IF EXISTS industry_extras_booking_form_scope_check;
ALTER TABLE public.industry_extras
  ADD CONSTRAINT industry_extras_booking_form_scope_check
  CHECK (booking_form_scope = ANY (ARRAY['form1'::text, 'form2'::text, 'form3'::text, 'form4'::text]));

COMMIT;
