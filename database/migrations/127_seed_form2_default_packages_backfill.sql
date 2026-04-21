-- Default Form 2 packages (industry_pricing_parameter, booking_form_scope = form2) when an industry has none.
-- Inserts one starter row per Form 2 item (industry_pricing_variable), linked via pricing_variable_id.

INSERT INTO public.industry_pricing_parameter (
  business_id,
  industry_id,
  name,
  description,
  variable_category,
  price,
  time_minutes,
  display,
  service_category,
  frequency,
  is_default,
  show_based_on_frequency,
  show_based_on_service_category,
  show_based_on_service_category2,
  sort_order,
  booking_form_scope,
  pricing_variable_id
)
SELECT
  v.business_id,
  v.industry_id,
  v.name::text,
  NULL::text,
  v.category,
  139::numeric,
  120::integer,
  'Customer Frontend, Backend & Admin'::text,
  NULL::text,
  NULL::text,
  true,
  false,
  false,
  false,
  v.sort_order,
  'form2'::text,
  v.id
FROM public.industry_pricing_variable v
INNER JOIN public.industries i ON i.id = v.industry_id
WHERE v.booking_form_scope = 'form2'
  AND COALESCE(i.customer_booking_form_layout, 'form1') = 'form2'
  AND NOT EXISTS (
    SELECT 1
    FROM public.industry_pricing_parameter p
    WHERE p.industry_id = v.industry_id
      AND p.business_id = v.business_id
      AND p.booking_form_scope = 'form2'
  );
