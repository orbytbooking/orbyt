-- Admin CRM UI preferences (replaces browser localStorage for theme + notification toggles).
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS email_notifications boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS push_notifications boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS admin_theme text NOT NULL DEFAULT 'dark';

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_admin_theme_check;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_admin_theme_check CHECK (admin_theme = ANY (ARRAY['light'::text, 'dark'::text]));

COMMENT ON COLUMN public.profiles.email_notifications IS 'Admin CRM: email notification preference';
COMMENT ON COLUMN public.profiles.push_notifications IS 'Admin CRM: push notification preference';
COMMENT ON COLUMN public.profiles.admin_theme IS 'Admin shell theme: light | dark';
