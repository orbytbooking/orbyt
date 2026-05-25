-- Create dedicated Form 2 add-ons table and migrate existing Form 2 add-on rows.
BEGIN;

CREATE TABLE IF NOT EXISTS public.industry_form2_addons
(LIKE public.industry_extras INCLUDING DEFAULTS INCLUDING CONSTRAINTS INCLUDING INDEXES);

-- Move previously stored Form 2 add-ons from the Form 2 extras table.
INSERT INTO public.industry_form2_addons
SELECT * FROM public.industry_form2_extras
WHERE booking_form_scope = 'form2'
  AND listing_kind = 'addon'
ON CONFLICT (id) DO NOTHING;

DELETE FROM public.industry_form2_extras
WHERE booking_form_scope = 'form2'
  AND listing_kind = 'addon';

-- Backfill any legacy Form 2 add-ons that may still be in the shared extras table.
INSERT INTO public.industry_form2_addons
SELECT * FROM public.industry_extras
WHERE booking_form_scope = 'form2'
  AND listing_kind = 'addon'
ON CONFLICT (id) DO NOTHING;

COMMIT;
