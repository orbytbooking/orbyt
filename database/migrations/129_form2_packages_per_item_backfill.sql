-- Form 2: insert default package rows for any pricing variable (item) that has none yet.
-- Fixes preset/catalog item categories other than Bedroom / Sq Ft (migration 127 only joined those).

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
  CASE tpl.template_key
    WHEN 'basic' THEN 'Basic Package ' || v.item_index::text
    WHEN 'premium' THEN 'Premium Package ' || v.item_index::text
    WHEN 'full_space' THEN 'Full Space Cleaning ' || v.item_index::text
    ELSE 'Rug Cleaning ' || v.item_index::text
  END AS name,
  CASE tpl.template_key
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
        WHEN trim(COALESCE(v.category, '')) = 'Sq Ft' THEN 'Deep cleaning of all rugs in the office.'
        ELSE 'Deep cleaning of all rugs in the home.'
      END
  END AS description,
  v.category AS variable_category,
  CASE tpl.template_key
    WHEN 'basic' THEN
      CASE v.item_index WHEN 1 THEN 139 WHEN 2 THEN 199 ELSE 299 END
    WHEN 'premium' THEN
      CASE v.item_index WHEN 1 THEN 199 WHEN 2 THEN 299 ELSE 459 END
    WHEN 'full_space' THEN
      CASE v.item_index WHEN 1 THEN 139 WHEN 2 THEN 199 ELSE 299 END
    ELSE
      CASE v.item_index WHEN 1 THEN 59 WHEN 2 THEN 89 ELSE 139 END
  END::numeric AS price,
  CASE tpl.template_key
    WHEN 'basic' THEN
      CASE v.item_index WHEN 1 THEN 120 WHEN 2 THEN 240 ELSE 360 END
    WHEN 'premium' THEN
      CASE v.item_index WHEN 1 THEN 180 WHEN 2 THEN 360 ELSE 480 END
    WHEN 'full_space' THEN
      CASE v.item_index WHEN 1 THEN 140 WHEN 2 THEN 240 ELSE 360 END
    ELSE
      CASE v.item_index WHEN 1 THEN 60 WHEN 2 THEN 80 ELSE 140 END
  END::integer AS time_minutes,
  'Customer Frontend, Backend & Admin'::text AS display,
  NULL::text AS service_category,
  NULL::text AS frequency,
  true AS is_default,
  false AS show_based_on_frequency,
  false AS show_based_on_service_category,
  false AS show_based_on_service_category2,
  (COALESCE(v.sort_order, 0) * 10 + tpl.template_order)::integer AS sort_order,
  'form2'::text AS booking_form_scope,
  v.pricing_variable_id
FROM (
  SELECT
    v.id AS pricing_variable_id,
    v.business_id,
    v.industry_id,
    trim(v.category) AS category,
    v.sort_order,
    ROW_NUMBER() OVER (
      PARTITION BY v.industry_id, v.business_id, trim(v.category)
      ORDER BY v.sort_order NULLS LAST, v.id
    ) AS item_index
  FROM public.industry_pricing_variable v
  INNER JOIN public.industries i ON i.id = v.industry_id
  WHERE v.booking_form_scope = 'form2'
    AND COALESCE(i.customer_booking_form_layout, 'form1') = 'form2'
    AND trim(COALESCE(v.category, '')) <> ''
    AND NOT EXISTS (
      SELECT 1
      FROM public.industry_pricing_parameter p
      WHERE p.pricing_variable_id = v.id
        AND p.business_id = v.business_id
        AND p.industry_id = v.industry_id
        AND p.booking_form_scope = 'form2'
    )
) v
CROSS JOIN LATERAL (
  SELECT 0 AS template_order, 'full_space'::text AS template_key
  WHERE trim(COALESCE(v.category, '')) = 'Sq Ft'
  UNION ALL
  SELECT 1, 'rug'::text
  WHERE trim(COALESCE(v.category, '')) = 'Sq Ft'
  UNION ALL
  SELECT 0, 'basic'::text
  WHERE trim(COALESCE(v.category, '')) <> 'Sq Ft'
  UNION ALL
  SELECT 1, 'premium'::text
  WHERE trim(COALESCE(v.category, '')) <> 'Sq Ft'
  UNION ALL
  SELECT 2, 'rug'::text
  WHERE trim(COALESCE(v.category, '')) <> 'Sq Ft'
) tpl;
