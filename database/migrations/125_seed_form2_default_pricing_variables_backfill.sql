-- Default Form 2 “Items” (industry_pricing_variable, booking_form_scope = form2) when none exist.

INSERT INTO public.industry_pricing_variable (
  business_id,
  industry_id,
  booking_form_scope,
  name,
  category,
  description,
  is_active,
  sort_order,
  display,
  popup_display,
  different_on_customer_end,
  customer_end_name,
  show_explanation_icon_on_form,
  explanation_tooltip_text,
  enable_popup_on_selection,
  popup_content
)
SELECT
  i.business_id,
  i.id,
  'form2'::text,
  v.name,
  v.category,
  ''::text,
  true,
  v.sort_order,
  'customer_frontend_backend_admin'::text,
  'customer_frontend_backend_admin'::text,
  false,
  NULL::text,
  false,
  NULL::text,
  false,
  ''::text
FROM public.industries i
CROSS JOIN (
  VALUES
    ('0-2 Bedroom Homes'::text, 'Bedroom'::text, 0::integer),
    ('3-4 Bedroom Homes'::text, 'Bedroom'::text, 1::integer),
    ('5-6 Bedroom Homes'::text, 'Bedroom'::text, 2::integer),
    ('Up To 1,000 SQ FT'::text, 'Sq Ft'::text, 3::integer),
    ('1,000-2,000 SQ FT'::text, 'Sq Ft'::text, 4::integer),
    ('2,000-3,000 SQ FT'::text, 'Sq Ft'::text, 5::integer)
) AS v(name, category, sort_order)
WHERE COALESCE(i.customer_booking_form_layout, 'form1') = 'form2'
  AND NOT EXISTS (
    SELECT 1
    FROM public.industry_pricing_variable p
    WHERE p.industry_id = i.id
      AND p.booking_form_scope = 'form2'
  );
