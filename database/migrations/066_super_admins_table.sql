-- Super admins: platform-level admins who can access /super-admin and see all businesses.
-- Only users listed here can use the Super Admin portal. Use service role to manage this table.
CREATE TABLE IF NOT EXISTS public.super_admins (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT super_admins_pkey PRIMARY KEY (id),
  CONSTRAINT super_admins_user_id_key UNIQUE (user_id)
);

CREATE INDEX IF NOT EXISTS idx_super_admins_user_id ON public.super_admins (user_id);

COMMENT ON TABLE public.super_admins IS 'Platform super admins; only these auth.users can access the Super Admin portal.';

-- Seed super admin (safe to re-run: ignores if already present)
INSERT INTO public.super_admins (user_id)
VALUES ('c4a07732-3e82-47d9-8afa-9ecf834f4719'::uuid)
ON CONFLICT (user_id) DO NOTHING;
