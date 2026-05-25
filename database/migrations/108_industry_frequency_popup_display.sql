-- Where to show the frequency "popup on selection" (independent of frequency.display)
ALTER TABLE public.industry_frequency
  ADD COLUMN IF NOT EXISTS popup_display text NOT NULL DEFAULT 'customer_frontend_backend_admin';

ALTER TABLE public.industry_frequency
  DROP CONSTRAINT IF EXISTS industry_frequency_popup_display_check;

ALTER TABLE public.industry_frequency
  ADD CONSTRAINT industry_frequency_popup_display_check CHECK (
    popup_display = ANY (ARRAY[
      'customer_frontend_backend_admin'::text,
      'customer_backend_admin'::text,
      'customer_frontend_backend'::text,
      'admin_only'::text
    ])
  );

COMMENT ON COLUMN public.industry_frequency.popup_display IS 'Surfaces for frequency popup: all; customer backend+admin (no public book-now); customer frontend+backend only; admin only';
