-- Global platform settings editable by Super Admin.
-- Singleton row (id = 1) accessed via service role APIs.

CREATE TABLE IF NOT EXISTS public.platform_settings (
  id integer PRIMARY KEY CHECK (id = 1),
  platform_display_name text NOT NULL DEFAULT 'Orbyt Service Platform',
  support_email text NOT NULL DEFAULT 'support@orbyt.com',
  status_page_url text NOT NULL DEFAULT 'https://status.orbyt.com',
  maintenance_mode_enabled boolean NOT NULL DEFAULT false,
  enforce_admin_mfa boolean NOT NULL DEFAULT true,
  send_incident_alerts boolean NOT NULL DEFAULT true,
  send_weekly_digest boolean NOT NULL DEFAULT false,
  session_timeout_hours integer NOT NULL DEFAULT 8 CHECK (session_timeout_hours > 0 AND session_timeout_hours <= 168),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

INSERT INTO public.platform_settings (id)
VALUES (1)
ON CONFLICT (id) DO NOTHING;

COMMENT ON TABLE public.platform_settings IS 'Singleton configuration for global Super Admin platform settings.';
