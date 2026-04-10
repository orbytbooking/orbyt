-- Per-module admin CRM access for team members (null = full access, legacy).
ALTER TABLE public.staff
  ADD COLUMN IF NOT EXISTS permissions jsonb DEFAULT NULL;

ALTER TABLE public.tenant_users
  ADD COLUMN IF NOT EXISTS permissions jsonb DEFAULT NULL;

COMMENT ON COLUMN public.staff.permissions IS 'JSON map of admin module keys to boolean; null means all modules allowed.';
COMMENT ON COLUMN public.tenant_users.permissions IS 'Effective module access; copied from staff on invite accept / sync.';
