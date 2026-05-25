-- Add admin_settings JSONB for admin-controlled provider settings (replaces localStorage)
ALTER TABLE public.service_providers
ADD COLUMN IF NOT EXISTS admin_settings jsonb DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.service_providers.admin_settings IS 'Admin-controlled settings: canSetOwnSchedule, canSetOwnSettings, merchantApprovalRequired, showUnassignedJobs, adminOnlyBooking, disableSameDayJobs, showPaymentMethod, hideProviderPayments, stripeConnectEnabled';
