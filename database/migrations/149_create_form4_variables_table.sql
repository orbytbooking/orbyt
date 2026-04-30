-- Create dedicated Form 4 variables table and backfill scoped rows.
BEGIN;

CREATE TABLE IF NOT EXISTS public.industry_form4_variables
(LIKE public.industry_pricing_variable INCLUDING DEFAULTS INCLUDING CONSTRAINTS INCLUDING INDEXES);

INSERT INTO public.industry_form4_variables
SELECT * FROM public.industry_pricing_variable
WHERE booking_form_scope = 'form4'
ON CONFLICT (id) DO NOTHING;

COMMIT;
