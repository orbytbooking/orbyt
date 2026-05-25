-- Add performance_score to service_providers (provider score 0-100, admin-set)
-- Use this if your service_providers table does not already have this column.

ALTER TABLE public.service_providers
ADD COLUMN IF NOT EXISTS performance_score numeric DEFAULT 0;

COMMENT ON COLUMN public.service_providers.performance_score IS 'Internal performance score (0-100). Admin can set in provider profile.';

CREATE INDEX IF NOT EXISTS idx_service_providers_performance_score ON public.service_providers(performance_score DESC);
