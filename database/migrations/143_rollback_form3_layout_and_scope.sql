-- Roll back Form 3 support in DB schema.
-- This migration safely remaps existing `form3` rows first, then restores
-- `form1`/`form2`-only CHECK constraints.

BEGIN;

-- 1) Remap industry layout from form3 -> form2 (closest existing single-page layout).
UPDATE public.industries
SET customer_booking_form_layout = 'form2'
WHERE customer_booking_form_layout = 'form3';

-- 2) Remap catalog scope from form3 -> form2 before tightening constraints.
UPDATE public.industry_frequency
SET booking_form_scope = 'form2'
WHERE booking_form_scope = 'form3';

UPDATE public.industry_service_category
SET booking_form_scope = 'form2'
WHERE booking_form_scope = 'form3';

UPDATE public.industry_pricing_parameter
SET booking_form_scope = 'form2'
WHERE booking_form_scope = 'form3';

UPDATE public.industry_pricing_variable
SET booking_form_scope = 'form2'
WHERE booking_form_scope = 'form3';

UPDATE public.industry_extras
SET booking_form_scope = 'form2'
WHERE booking_form_scope = 'form3';

-- 3) Restore industries layout constraint to form1/form2 only.
ALTER TABLE public.industries
  DROP CONSTRAINT IF EXISTS industries_customer_booking_form_layout_check;

ALTER TABLE public.industries
  ADD CONSTRAINT industries_customer_booking_form_layout_check
  CHECK (customer_booking_form_layout = ANY (ARRAY['form1'::text, 'form2'::text]));

COMMENT ON COLUMN public.industries.customer_booking_form_layout IS
  'Customer book-now layout for this industry: form1 (multi-step) or form2 (single page + sidebar).';

-- 4) Restore booking_form_scope constraints to form1/form2 only.
ALTER TABLE public.industry_frequency
  DROP CONSTRAINT IF EXISTS industry_frequency_booking_form_scope_check;
ALTER TABLE public.industry_frequency
  ADD CONSTRAINT industry_frequency_booking_form_scope_check
  CHECK (booking_form_scope = ANY (ARRAY['form1'::text, 'form2'::text]));

ALTER TABLE public.industry_service_category
  DROP CONSTRAINT IF EXISTS industry_service_category_booking_form_scope_check;
ALTER TABLE public.industry_service_category
  ADD CONSTRAINT industry_service_category_booking_form_scope_check
  CHECK (booking_form_scope = ANY (ARRAY['form1'::text, 'form2'::text]));

ALTER TABLE public.industry_pricing_parameter
  DROP CONSTRAINT IF EXISTS industry_pricing_parameter_booking_form_scope_check;
ALTER TABLE public.industry_pricing_parameter
  ADD CONSTRAINT industry_pricing_parameter_booking_form_scope_check
  CHECK (booking_form_scope = ANY (ARRAY['form1'::text, 'form2'::text]));

ALTER TABLE public.industry_pricing_variable
  DROP CONSTRAINT IF EXISTS industry_pricing_variable_booking_form_scope_check;
ALTER TABLE public.industry_pricing_variable
  ADD CONSTRAINT industry_pricing_variable_booking_form_scope_check
  CHECK (booking_form_scope = ANY (ARRAY['form1'::text, 'form2'::text]));

ALTER TABLE public.industry_extras
  DROP CONSTRAINT IF EXISTS industry_extras_booking_form_scope_check;
ALTER TABLE public.industry_extras
  ADD CONSTRAINT industry_extras_booking_form_scope_check
  CHECK (booking_form_scope = ANY (ARRAY['form1'::text, 'form2'::text]));

COMMIT;

