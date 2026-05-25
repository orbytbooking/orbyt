-- Default admin shell theme: light (was dark in 096).
ALTER TABLE public.profiles
  ALTER COLUMN admin_theme SET DEFAULT 'light';
