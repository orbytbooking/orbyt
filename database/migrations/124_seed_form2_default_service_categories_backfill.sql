-- Default Form 2 service categories when an industry uses Form 2 and has none yet (matches app seed).

INSERT INTO public.industry_service_category (
  business_id,
  industry_id,
  booking_form_scope,
  name,
  display,
  service_category_frequency,
  selected_frequencies,
  variables,
  sort_order
)
SELECT
  i.business_id,
  i.id,
  'form2'::text,
  v.name,
  'customer_frontend_backend_admin'::text,
  true,
  ARRAY[
    '2x per week',
    '3x per week',
    'Daily 5x per week',
    'One-Time',
    'Weekly',
    'Every Other Week',
    'Monthly'
  ]::text[],
  '{}'::jsonb,
  v.sort_order
FROM public.industries i
CROSS JOIN (
  VALUES
    ('Home Cleaning'::text, 0::integer),
    ('Commercial Cleaning'::text, 1::integer)
) AS v(name, sort_order)
WHERE COALESCE(i.customer_booking_form_layout, 'form1') = 'form2'
  AND NOT EXISTS (
    SELECT 1
    FROM public.industry_service_category c
    WHERE c.industry_id = i.id
      AND c.booking_form_scope = 'form2'
  );
