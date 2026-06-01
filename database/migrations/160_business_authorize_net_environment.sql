-- Per-business Authorize.Net environment (sandbox vs live) for tenant payment keys.

ALTER TABLE public.businesses
ADD COLUMN IF NOT EXISTS authorize_net_environment text;

COMMENT ON COLUMN public.businesses.authorize_net_environment IS
  'Authorize.Net cluster for this business: sandbox or production. Must match API Login ID / Public Client Key.';

ALTER TABLE public.businesses
DROP CONSTRAINT IF EXISTS businesses_authorize_net_environment_check;

ALTER TABLE public.businesses
ADD CONSTRAINT businesses_authorize_net_environment_check
CHECK (authorize_net_environment IS NULL OR authorize_net_environment IN ('sandbox', 'production'));
