-- Default Form 2 packages (industry_pricing_parameter, booking_form_scope = form2) when an industry has none.
-- Creates package templates per item so customer-facing Form 2 shows real package choices.

WITH form2_items AS (
  SELECT
    v.id AS pricing_variable_id,
    v.business_id,
    v.industry_id,
    v.category,
    v.sort_order,
    ROW_NUMBER() OVER (
      PARTITION BY v.industry_id, v.business_id, v.category
      ORDER BY v.sort_order, v.id
    ) AS item_index
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
    )
),
package_templates AS (
  SELECT 'Bedroom'::text AS category, 'basic'::text AS template_key, 0::integer AS template_order
  UNION ALL SELECT 'Bedroom'::text, 'premium'::text, 1::integer
  UNION ALL SELECT 'Bedroom'::text, 'rug'::text, 2::integer
  UNION ALL SELECT 'Sq Ft'::text, 'full_space'::text, 0::integer
  UNION ALL SELECT 'Sq Ft'::text, 'rug'::text, 1::integer
)
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
  i.business_id,
  i.industry_id,
  CASE t.template_key
    WHEN 'basic' THEN 'Basic Package ' || i.item_index::text
    WHEN 'premium' THEN 'Premium Package ' || i.item_index::text
    WHEN 'full_space' THEN 'Full Space Cleaning ' || i.item_index::text
    ELSE 'Rug Cleaning ' || i.item_index::text
  END AS name,
  CASE t.template_key
    WHEN 'basic' THEN
      'This is a full home carpet cleaning.' || E'\n' ||
      '• All Carpets' || E'\n' ||
      '• All Rugs' || E'\n' ||
      '• Deep Steaming' || E'\n' ||
      '• Hot Water Extraction'
    WHEN 'premium' THEN
      'This is a full home carpet cleaning with extras.' || E'\n' ||
      '• All Carpets' || E'\n' ||
      '• All Rugs and Mats' || E'\n' ||
      '• All Bed Mattresses' || E'\n' ||
      '• All Upholstery' || E'\n' ||
      '• Deep Steaming' || E'\n' ||
      '• Hot Water Extraction'
    WHEN 'full_space' THEN
      'This is a full commercial carpet and rug cleaning.' || E'\n' ||
      '• All Carpets' || E'\n' ||
      '• All Rugs' || E'\n' ||
      '• Deep Steaming' || E'\n' ||
      '• Hot Water Extraction'
    ELSE
      CASE
        WHEN i.category = 'Sq Ft' THEN 'Deep cleaning of all rugs in the office.'
        ELSE 'Deep cleaning of all rugs in the home.'
      END
  END AS description,
  i.category AS variable_category,
  CASE t.template_key
    WHEN 'basic' THEN CASE i.item_index WHEN 1 THEN 139 WHEN 2 THEN 199 ELSE 299 END
    WHEN 'premium' THEN CASE i.item_index WHEN 1 THEN 199 WHEN 2 THEN 299 ELSE 459 END
    WHEN 'full_space' THEN CASE i.item_index WHEN 1 THEN 139 WHEN 2 THEN 199 ELSE 299 END
    ELSE CASE i.item_index WHEN 1 THEN 59 WHEN 2 THEN 89 ELSE 139 END
  END::numeric AS price,
  CASE t.template_key
    WHEN 'basic' THEN CASE i.item_index WHEN 1 THEN 120 WHEN 2 THEN 240 ELSE 360 END
    WHEN 'premium' THEN CASE i.item_index WHEN 1 THEN 180 WHEN 2 THEN 360 ELSE 480 END
    WHEN 'full_space' THEN CASE i.item_index WHEN 1 THEN 140 WHEN 2 THEN 240 ELSE 360 END
    ELSE CASE i.item_index WHEN 1 THEN 60 WHEN 2 THEN 80 ELSE 140 END
  END::integer AS time_minutes,
  'Customer Frontend, Backend & Admin'::text AS display,
  NULL::text AS service_category,
  NULL::text AS frequency,
  true AS is_default,
  false AS show_based_on_frequency,
  false AS show_based_on_service_category,
  false AS show_based_on_service_category2,
  (i.sort_order * 10 + t.template_order)::integer AS sort_order,
  'form2'::text AS booking_form_scope,
  i.pricing_variable_id
FROM form2_items i
INNER JOIN package_templates t ON t.category = i.category;
