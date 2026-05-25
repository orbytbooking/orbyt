-- Per-business HTML email wrappers (Settings → Notifications → Notification templates)

CREATE TABLE IF NOT EXISTS public.business_notification_templates (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  name text NOT NULL,
  subject text NOT NULL DEFAULT ''::text,
  body text NOT NULL DEFAULT ''::text,
  enabled boolean NOT NULL DEFAULT true,
  is_default boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT business_notification_templates_pkey PRIMARY KEY (id)
);

CREATE INDEX IF NOT EXISTS idx_business_notification_templates_business_id
  ON public.business_notification_templates (business_id);

CREATE UNIQUE INDEX IF NOT EXISTS idx_business_notification_templates_one_default_per_business
  ON public.business_notification_templates (business_id)
  WHERE is_default = true;

COMMENT ON TABLE public.business_notification_templates IS 'Tenant-editable master email HTML; optional default for outbound mail.';
