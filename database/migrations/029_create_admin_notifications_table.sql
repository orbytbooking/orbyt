-- Admin panel notifications (header bell) - persisted per business
CREATE TABLE IF NOT EXISTS public.admin_notifications (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL,
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  read boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT admin_notifications_pkey PRIMARY KEY (id),
  CONSTRAINT admin_notifications_business_id_fkey FOREIGN KEY (business_id) REFERENCES public.businesses(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_admin_notifications_business_id ON public.admin_notifications (business_id);
CREATE INDEX IF NOT EXISTS idx_admin_notifications_business_read ON public.admin_notifications (business_id, read);
CREATE INDEX IF NOT EXISTS idx_admin_notifications_created_at ON public.admin_notifications (business_id, created_at DESC);

COMMENT ON TABLE public.admin_notifications IS 'In-app notifications for admin panel header; one per business.';
