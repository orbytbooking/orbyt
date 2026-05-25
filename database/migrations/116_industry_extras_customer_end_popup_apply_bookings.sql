-- Form 1 parity: customer-facing name, explanation tooltip, selection popup, popup surface, apply-to-all bookings.
-- Prerequisite: run 095_industry_extras_manual_multiply_pricing.sql first if `manual_prices` / `pricing_structure` are missing.
ALTER TABLE public.industry_extras
  ADD COLUMN IF NOT EXISTS different_on_customer_end boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS customer_end_name text,
  ADD COLUMN IF NOT EXISTS show_explanation_icon_on_form boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS explanation_tooltip_text text,
  ADD COLUMN IF NOT EXISTS enable_popup_on_selection boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS popup_content text,
  ADD COLUMN IF NOT EXISTS popup_display text NOT NULL DEFAULT 'customer_frontend_backend_admin',
  ADD COLUMN IF NOT EXISTS apply_to_all_bookings boolean NOT NULL DEFAULT true;

ALTER TABLE public.industry_extras
  DROP CONSTRAINT IF EXISTS industry_extras_popup_display_check;

ALTER TABLE public.industry_extras
  ADD CONSTRAINT industry_extras_popup_display_check CHECK (
    popup_display = ANY (ARRAY[
      'customer_frontend_backend_admin'::text,
      'customer_backend_admin'::text,
      'customer_frontend_backend'::text,
      'admin_only'::text
    ])
  );

COMMENT ON COLUMN public.industry_extras.popup_display IS 'Where enable_popup_on_selection content is shown (book-now / admin booking surfaces)';
COMMENT ON COLUMN public.industry_extras.different_on_customer_end IS 'Use customer_end_name on customer booking instead of name';
COMMENT ON COLUMN public.industry_extras.apply_to_all_bookings IS 'When false, extra applies only to the first appointment (product rule; pricing may consume later)';
