-- Form 1 parity: customer-facing name, explanation tooltip, selection popup, popup surface (same values as pricing variables / frequencies).
ALTER TABLE public.industry_exclude_parameter
  ADD COLUMN IF NOT EXISTS different_on_customer_end boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS customer_end_name text,
  ADD COLUMN IF NOT EXISTS show_explanation_icon_on_form boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS explanation_tooltip_text text,
  ADD COLUMN IF NOT EXISTS enable_popup_on_selection boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS popup_content text,
  ADD COLUMN IF NOT EXISTS popup_display text NOT NULL DEFAULT 'customer_frontend_backend_admin';

ALTER TABLE public.industry_exclude_parameter
  DROP CONSTRAINT IF EXISTS industry_exclude_parameter_popup_display_check;

ALTER TABLE public.industry_exclude_parameter
  ADD CONSTRAINT industry_exclude_parameter_popup_display_check CHECK (
    popup_display = ANY (ARRAY[
      'customer_frontend_backend_admin'::text,
      'customer_backend_admin'::text,
      'customer_frontend_backend'::text,
      'admin_only'::text
    ])
  );

COMMENT ON COLUMN public.industry_exclude_parameter.popup_display IS 'Where enable_popup_on_selection content is shown (book-now / admin booking surfaces)';
COMMENT ON COLUMN public.industry_exclude_parameter.different_on_customer_end IS 'Use customer_end_name on customer booking instead of name';
