-- MVP: Control what customers see about providers (score/rating, completed jobs, availability)
ALTER TABLE public.business_store_options
  ADD COLUMN IF NOT EXISTS show_provider_score_to_customers boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS show_provider_completed_jobs_to_customers boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS show_provider_availability_to_customers boolean DEFAULT true;

COMMENT ON COLUMN public.business_store_options.show_provider_score_to_customers IS 'Show provider score/rating to customers when choosing a provider (book-now)';
COMMENT ON COLUMN public.business_store_options.show_provider_completed_jobs_to_customers IS 'Show completed jobs count to customers when choosing a provider';
COMMENT ON COLUMN public.business_store_options.show_provider_availability_to_customers IS 'Show availability status (e.g. available dot) to customers when choosing a provider';
