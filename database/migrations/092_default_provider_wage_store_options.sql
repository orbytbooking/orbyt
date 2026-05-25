-- Default provider pay (Settings → General → Provider). Applied when guest/customer bookings omit provider_wage.
ALTER TABLE public.business_store_options
  ADD COLUMN IF NOT EXISTS default_provider_wage numeric,
  ADD COLUMN IF NOT EXISTS default_provider_wage_type text;

COMMENT ON COLUMN public.business_store_options.default_provider_wage IS 'When set with default_provider_wage_type, applied to guest/customer/admin bookings that do not send provider_wage';
COMMENT ON COLUMN public.business_store_options.default_provider_wage_type IS 'percentage | fixed | hourly; matches bookings.provider_wage_type';
