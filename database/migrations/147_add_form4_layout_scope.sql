-- Form 4: unit-structure pricing (price × quantity) per BookingKoala-style catalog setup.
BEGIN;

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

-- Unit label shown next to the customer quantity input (e.g. "Square Feet").
ALTER TABLE public.industry_pricing_parameter
  ADD COLUMN IF NOT EXISTS unit_label text;
COMMENT ON COLUMN public.industry_pricing_parameter.unit_label IS
  'Form 4: display label for the unit customers enter (e.g. Square Feet). Price and time_minutes are per one unit.';

COMMIT;
