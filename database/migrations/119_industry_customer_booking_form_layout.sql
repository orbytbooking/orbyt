-- Per-industry public book-now layout (Form 1 stepper vs Form 2 single-page)
ALTER TABLE public.industries
ADD COLUMN IF NOT EXISTS customer_booking_form_layout text NOT NULL DEFAULT 'form1'::text
CHECK (customer_booking_form_layout = ANY (ARRAY['form1'::text, 'form2'::text]));

COMMENT ON COLUMN public.industries.customer_booking_form_layout IS
  'Customer book-now layout for this industry: form1 (multi-step) or form2 (single page + sidebar)';
