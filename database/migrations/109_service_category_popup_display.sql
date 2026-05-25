-- Same surface options as industry_frequency.popup_display
ALTER TABLE public.industry_service_category
  ADD COLUMN IF NOT EXISTS popup_display text NOT NULL DEFAULT 'customer_frontend_backend_admin';

ALTER TABLE public.industry_service_category
  DROP CONSTRAINT IF EXISTS industry_service_category_popup_display_check;

ALTER TABLE public.industry_service_category
  ADD CONSTRAINT industry_service_category_popup_display_check CHECK (
    popup_display = ANY (ARRAY[
      'customer_frontend_backend_admin'::text,
      'customer_backend_admin'::text,
      'customer_frontend_backend'::text,
      'admin_only'::text
    ])
  );

COMMENT ON COLUMN public.industry_service_category.popup_display IS 'Where selection popup appears (enable_popup_on_selection content)';
