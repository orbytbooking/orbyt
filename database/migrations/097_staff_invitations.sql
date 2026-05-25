-- Link staff rows to auth users after invite acceptance; track pending invites (mirrors provider_invitations).
ALTER TABLE public.staff
  ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users (id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_staff_user_id ON public.staff (user_id) WHERE user_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.staff_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid (),
  business_id uuid NOT NULL REFERENCES public.businesses (id) ON DELETE CASCADE,
  staff_id uuid NOT NULL REFERENCES public.staff (id) ON DELETE CASCADE,
  email text NOT NULL,
  invitation_token text NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'pending' CHECK (
    status = ANY (
      ARRAY['pending'::text, 'accepted'::text, 'expired'::text, 'cancelled'::text]
    )
  ),
  invited_by uuid REFERENCES auth.users (id),
  invited_at timestamptz NOT NULL DEFAULT now(),
  accepted_at timestamptz,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '30 days'),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_staff_invitations_token ON public.staff_invitations (invitation_token);
CREATE INDEX IF NOT EXISTS idx_staff_invitations_business_email
  ON public.staff_invitations (business_id, email)
  WHERE status = 'pending';

COMMENT ON TABLE public.staff_invitations IS 'Pending admin/staff CRM invites; accept flow creates auth user, links staff.user_id, inserts tenant_users.';
