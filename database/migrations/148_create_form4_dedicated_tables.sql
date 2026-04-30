-- Create dedicated Form 4 tables and backfill existing scoped rows.
BEGIN;

CREATE TABLE IF NOT EXISTS public.industry_form4_frequencies
(LIKE public.industry_frequency INCLUDING DEFAULTS INCLUDING CONSTRAINTS INCLUDING INDEXES);

CREATE TABLE IF NOT EXISTS public.industry_form4_service_categories
(LIKE public.industry_service_category INCLUDING DEFAULTS INCLUDING CONSTRAINTS INCLUDING INDEXES);

CREATE TABLE IF NOT EXISTS public.industry_form4_pricing_parameters
(LIKE public.industry_pricing_parameter INCLUDING DEFAULTS INCLUDING CONSTRAINTS INCLUDING INDEXES);

CREATE TABLE IF NOT EXISTS public.industry_form4_extras
(LIKE public.industry_extras INCLUDING DEFAULTS INCLUDING CONSTRAINTS INCLUDING INDEXES);

INSERT INTO public.industry_form4_frequencies
SELECT * FROM public.industry_frequency
WHERE booking_form_scope = 'form4'
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.industry_form4_service_categories
SELECT * FROM public.industry_service_category
WHERE booking_form_scope = 'form4'
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.industry_form4_pricing_parameters
SELECT * FROM public.industry_pricing_parameter
WHERE booking_form_scope = 'form4'
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.industry_form4_extras
SELECT * FROM public.industry_extras
WHERE booking_form_scope = 'form4'
ON CONFLICT (id) DO NOTHING;

COMMIT;
