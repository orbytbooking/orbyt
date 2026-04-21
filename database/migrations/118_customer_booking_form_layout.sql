-- Public book-now layout: form1 (stepper) vs form2 (single-page two-column)
ALTER TABLE public.business_store_options
ADD COLUMN IF NOT EXISTS customer_booking_form_layout text NOT NULL DEFAULT 'form1'::text
CHECK (customer_booking_form_layout = ANY (ARRAY['form1'::text, 'form2'::text]));

COMMENT ON COLUMN public.business_store_options.customer_booking_form_layout IS
  'Customer book-now page layout: form1 (multi-step) or form2 (single scroll with sidebar)';
