-- Backfill Form 2 default frequencies for industries already on Form 2 with none seeded yet.
-- Matches app seed `seedForm2DefaultFrequenciesIfEmpty` (same seven rows as Form 1 starter template).

INSERT INTO public.industry_frequency (
  business_id,
  industry_id,
  booking_form_scope,
  name,
  display,
  occurrence_time,
  discount,
  discount_type,
  is_default,
  popup_display,
  frequency_repeats,
  shorter_job_length,
  shorter_job_length_by,
  exclude_first_appointment,
  frequency_discount,
  charge_one_time_price,
  service_categories,
  bathroom_variables,
  sqft_variables,
  bedroom_variables,
  exclude_parameters,
  extras,
  show_based_on_location,
  location_ids,
  is_active
)
SELECT
  i.business_id,
  i.id,
  'form2'::text,
  v.name,
  'Both'::text,
  v.occurrence_time,
  v.discount,
  '%'::text,
  v.is_default,
  'customer_frontend_backend_admin'::text,
  v.frequency_repeats,
  'no'::text,
  '0'::text,
  false,
  'all'::text,
  false,
  ARRAY[]::text[],
  ARRAY[]::text[],
  ARRAY[]::text[],
  ARRAY[]::text[],
  ARRAY[]::text[],
  ARRAY[]::text[],
  false,
  ARRAY[]::text[],
  true
FROM public.industries i
CROSS JOIN (
  VALUES
    ('2x per week', 'recurring'::text, 0::numeric, false, 'every-mon-fri'::text),
    ('3x per week', 'recurring'::text, 0::numeric, false, 'every-mon-wed-fri'::text),
    ('Daily 5x per week', 'recurring'::text, 10::numeric, false, 'daily-no-sat-sun'::text),
    ('One-Time', 'onetime'::text, 0::numeric, true, NULL::text),
    ('Weekly', 'recurring'::text, 15::numeric, false, 'every-week'::text),
    ('Every Other Week', 'recurring'::text, 10::numeric, false, 'every-2-weeks'::text),
    ('Monthly', 'recurring'::text, 5::numeric, false, 'every-4-weeks'::text)
) AS v(name, occurrence_time, discount, is_default, frequency_repeats)
WHERE COALESCE(i.customer_booking_form_layout, 'form1') = 'form2'
  AND NOT EXISTS (
    SELECT 1
    FROM public.industry_frequency f
    WHERE f.industry_id = i.id
      AND f.booking_form_scope = 'form2'
  );
