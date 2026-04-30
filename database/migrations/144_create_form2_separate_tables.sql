-- Create dedicated Form 2 tables and migrate existing Form 2 rows.
BEGIN;

CREATE TABLE IF NOT EXISTS public.industry_form2_frequencies
(LIKE public.industry_frequency INCLUDING DEFAULTS INCLUDING CONSTRAINTS INCLUDING INDEXES);

CREATE TABLE IF NOT EXISTS public.industry_form2_service_categories
(LIKE public.industry_service_category INCLUDING DEFAULTS INCLUDING CONSTRAINTS INCLUDING INDEXES);

CREATE TABLE IF NOT EXISTS public.industry_form2_items
(LIKE public.industry_pricing_variable INCLUDING DEFAULTS INCLUDING CONSTRAINTS INCLUDING INDEXES);

CREATE TABLE IF NOT EXISTS public.industry_form2_packages
(LIKE public.industry_pricing_parameter INCLUDING DEFAULTS INCLUDING CONSTRAINTS INCLUDING INDEXES);

CREATE TABLE IF NOT EXISTS public.industry_form2_extras
(LIKE public.industry_extras INCLUDING DEFAULTS INCLUDING CONSTRAINTS INCLUDING INDEXES);

INSERT INTO public.industry_form2_frequencies
SELECT * FROM public.industry_frequency
WHERE booking_form_scope = 'form2'
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.industry_form2_service_categories
SELECT * FROM public.industry_service_category
WHERE booking_form_scope = 'form2'
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.industry_form2_items
SELECT * FROM public.industry_pricing_variable
WHERE booking_form_scope = 'form2'
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.industry_form2_packages
SELECT * FROM public.industry_pricing_parameter
WHERE booking_form_scope = 'form2'
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.industry_form2_extras
SELECT * FROM public.industry_extras
WHERE booking_form_scope = 'form2'
ON CONFLICT (id) DO NOTHING;

COMMIT;

