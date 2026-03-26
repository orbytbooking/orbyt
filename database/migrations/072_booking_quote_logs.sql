-- Draft/quote activity history and quote email audit (admin "View History" modal).

CREATE TABLE IF NOT EXISTS public.booking_quote_activity_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL,
  booking_id uuid NOT NULL,
  actor_user_id uuid,
  actor_name text,
  activity_text text NOT NULL,
  event_key text,
  ip_address text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT booking_quote_activity_logs_pkey PRIMARY KEY (id),
  CONSTRAINT booking_quote_activity_logs_business_id_fkey FOREIGN KEY (business_id) REFERENCES public.businesses (id) ON DELETE CASCADE,
  CONSTRAINT booking_quote_activity_logs_booking_id_fkey FOREIGN KEY (booking_id) REFERENCES public.bookings (id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_booking_quote_activity_logs_booking_id
  ON public.booking_quote_activity_logs (booking_id);

CREATE INDEX IF NOT EXISTS idx_booking_quote_activity_logs_business_id
  ON public.booking_quote_activity_logs (business_id);

CREATE TABLE IF NOT EXISTS public.booking_quote_email_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL,
  booking_id uuid NOT NULL,
  actor_user_id uuid,
  to_email text NOT NULL,
  subject text NOT NULL,
  status text NOT NULL CHECK (status = ANY (ARRAY['sent'::text, 'failed'::text])),
  error_message text,
  ip_address text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT booking_quote_email_logs_pkey PRIMARY KEY (id),
  CONSTRAINT booking_quote_email_logs_business_id_fkey FOREIGN KEY (business_id) REFERENCES public.businesses (id) ON DELETE CASCADE,
  CONSTRAINT booking_quote_email_logs_booking_id_fkey FOREIGN KEY (booking_id) REFERENCES public.bookings (id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_booking_quote_email_logs_booking_id
  ON public.booking_quote_email_logs (booking_id);

CREATE INDEX IF NOT EXISTS idx_booking_quote_email_logs_business_id
  ON public.booking_quote_email_logs (business_id);

COMMENT ON TABLE public.booking_quote_activity_logs IS 'Audit trail for draft/quote lifecycle (admin Draft/Quote logs > History).';
COMMENT ON TABLE public.booking_quote_email_logs IS 'Quote emails sent from admin (Draft/Quote logs > Email logs).';
