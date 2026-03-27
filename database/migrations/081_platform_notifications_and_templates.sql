-- Platform-level notifications & announcements (Super Admin)
-- - Announcements: maintenance notices, product updates (shown to all tenants)
-- - Email templates: system email template storage (editable)

CREATE TABLE IF NOT EXISTS public.platform_announcements (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  title text NOT NULL,
  body text NOT NULL,
  level text NOT NULL DEFAULT 'info' CHECK (level IN ('info','warning','maintenance','success')),
  is_active boolean NOT NULL DEFAULT true,
  starts_at timestamp with time zone,
  ends_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  created_by uuid,
  CONSTRAINT platform_announcements_pkey PRIMARY KEY (id)
);

CREATE INDEX IF NOT EXISTS idx_platform_announcements_active ON public.platform_announcements (is_active);
CREATE INDEX IF NOT EXISTS idx_platform_announcements_created_at ON public.platform_announcements (created_at DESC);

COMMENT ON TABLE public.platform_announcements IS 'Platform-wide announcements controlled by Super Admin.';

CREATE TABLE IF NOT EXISTS public.platform_email_templates (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  key text NOT NULL UNIQUE,
  name text NOT NULL,
  subject text NOT NULL DEFAULT '',
  body_text text NOT NULL DEFAULT '',
  body_html text NOT NULL DEFAULT '',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT platform_email_templates_pkey PRIMARY KEY (id)
);

CREATE INDEX IF NOT EXISTS idx_platform_email_templates_active ON public.platform_email_templates (is_active);

COMMENT ON TABLE public.platform_email_templates IS 'Editable system email templates (Super Admin).';

