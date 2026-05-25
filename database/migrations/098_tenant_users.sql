-- Team access for admin CRM (used by staff invite accept + booking access checks).
CREATE TABLE IF NOT EXISTS public.tenant_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid (),
  business_id uuid NOT NULL REFERENCES public.businesses (id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'staff'::text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT tenant_users_business_user_unique UNIQUE (business_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_tenant_users_user_id ON public.tenant_users (user_id);
CREATE INDEX IF NOT EXISTS idx_tenant_users_business_id ON public.tenant_users (business_id);

COMMENT ON TABLE public.tenant_users IS 'Non-owner users with access to a business CRM (staff invite, team members).';
