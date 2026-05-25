-- Form 1 parity with industry_service_category: visibility, explanation tooltip, selection popup.
ALTER TABLE public.industry_pricing_variable
  ADD COLUMN IF NOT EXISTS show_explanation_icon_on_form boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS explanation_tooltip_text text,
  ADD COLUMN IF NOT EXISTS enable_popup_on_selection boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS popup_content text,
  ADD COLUMN IF NOT EXISTS popup_display text NOT NULL DEFAULT 'customer_frontend_backend_admin',
  ADD COLUMN IF NOT EXISTS display text NOT NULL DEFAULT 'customer_frontend_backend_admin';

ALTER TABLE public.industry_pricing_variable
  DROP CONSTRAINT IF EXISTS industry_pricing_variable_popup_display_check;

ALTER TABLE public.industry_pricing_variable
  ADD CONSTRAINT industry_pricing_variable_popup_display_check CHECK (
    popup_display = ANY (ARRAY[
      'customer_frontend_backend_admin'::text,
      'customer_backend_admin'::text,
      'customer_frontend_backend'::text,
      'admin_only'::text
    ])
  );

ALTER TABLE public.industry_pricing_variable
  DROP CONSTRAINT IF EXISTS industry_pricing_variable_display_check;

ALTER TABLE public.industry_pricing_variable
  ADD CONSTRAINT industry_pricing_variable_display_check CHECK (
    display = ANY (ARRAY[
      'customer_frontend_backend_admin'::text,
      'customer_backend_admin'::text,
      'admin_only'::text
    ])
  );

COMMENT ON COLUMN public.industry_pricing_variable.display IS 'Where this variable category appears (customer vs admin booking)';
COMMENT ON COLUMN public.industry_pricing_variable.popup_display IS 'Where enable_popup_on_selection content is shown';
