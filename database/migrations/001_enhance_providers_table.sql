-- ========================================
-- MIGRATION: ENHANCE SERVICE_PROVIDERS TABLE
-- ========================================
-- This migration adds missing BookingKoala-specific fields to the service_providers table

-- Add missing columns to service_providers table
ALTER TABLE public.service_providers 
ADD COLUMN IF NOT EXISTS date_of_birth date,
ADD COLUMN IF NOT EXISTS ssn text, -- For background checks (encrypted)
ADD COLUMN IF NOT EXISTS emergency_contact_name text,
ADD COLUMN IF NOT EXISTS emergency_contact_phone text,
ADD COLUMN IF NOT EXISTS emergency_contact_email text,
ADD COLUMN IF NOT EXISTS profile_image_url text,
ADD COLUMN IF NOT EXISTS bio text,
ADD COLUMN IF NOT EXISTS skills text[], -- Array of skills
ADD COLUMN IF NOT EXISTS certifications text[], -- Array of certifications
ADD COLUMN IF NOT EXISTS insurance_info jsonb, -- Insurance details
ADD COLUMN IF NOT EXISTS background_check_completed boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS background_check_date date,
ADD COLUMN IF NOT EXISTS contract_type text DEFAULT 'independent' CHECK (contract_type IN ('independent', 'employee', 'contractor')),
ADD COLUMN IF NOT EXISTS contract_start_date date,
ADD COLUMN IF NOT EXISTS contract_end_date date,
ADD COLUMN IF NOT EXISTS hourly_rate numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS currency text DEFAULT 'USD',
ADD COLUMN IF NOT EXISTS tax_id text,
ADD COLUMN IF NOT EXISTS bank_account_info jsonb, -- Encrypted banking info
ADD COLUMN IF NOT EXISTS payout_method text DEFAULT 'bank_transfer' CHECK (payout_method IN ('bank_transfer', 'stripe', 'paypal', 'cash')),
ADD COLUMN IF NOT EXISTS payout_frequency text DEFAULT 'weekly' CHECK (payout_frequency IN ('daily', 'weekly', 'biweekly', 'monthly')),
ADD COLUMN IF NOT EXISTS payout_email text,
ADD COLUMN IF NOT EXISTS last_payout_date date,
ADD COLUMN IF NOT EXISTS total_earned numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_paid_out numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS current_balance numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS availability_status text DEFAULT 'available' CHECK (availability_status IN ('available', 'busy', 'unavailable', 'on_vacation')),
ADD COLUMN IF NOT EXISTS preferred_work_days integer[] DEFAULT ARRAY[1,2,3,4,5], -- Monday-Friday
ADD COLUMN IF NOT EXISTS preferred_work_start_time time DEFAULT '09:00:00',
ADD COLUMN IF NOT EXISTS preferred_work_end_time time DEFAULT '17:00:00',
ADD COLUMN IF NOT EXISTS timezone text DEFAULT 'UTC',
ADD COLUMN IF NOT EXISTS languages text[] DEFAULT ARRAY['english'],
ADD COLUMN IF NOT EXISTS vehicle_info jsonb, -- Vehicle details for mobile services
ADD COLUMN IF NOT EXISTS equipment text[], -- Equipment they own
ADD COLUMN IF NOT EXISTS uniform_required boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS training_completed boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS training_date date,
ADD COLUMN IF NOT EXISTS performance_score numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS customer_rating numeric DEFAULT 0,
ADD COLUMN EXISTS is_verified_provider boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS verification_date date,
ADD COLUMN IF NOT EXISTS notes text,
ADD COLUMN IF NOT EXISTS internal_notes text, -- Admin-only notes
ADD COLUMN IF NOT EXISTS last_active_at timestamp with time zone DEFAULT now(),
ADD COLUMN IF NOT EXISTS notification_preferences jsonb DEFAULT '{"email": true, "sms": false, "push": true}'::jsonb,
ADD COLUMN IF NOT EXISTS privacy_settings jsonb DEFAULT '{"show_phone": true, "show_email": true, "show_address": false}'::jsonb;

-- Create indexes for new columns
CREATE INDEX IF NOT EXISTS idx_service_providers_contract_type ON public.service_providers(contract_type);
CREATE INDEX IF NOT EXISTS idx_service_providers_availability_status ON public.service_providers(availability_status);
CREATE INDEX IF NOT EXISTS idx_service_providers_performance_score ON public.service_providers(performance_score DESC);
CREATE INDEX IF NOT EXISTS idx_service_providers_customer_rating ON public.service_providers(customer_rating DESC);
CREATE INDEX IF NOT EXISTS idx_service_providers_last_active ON public.service_providers(last_active_at DESC);

-- Update existing providers with default values
UPDATE public.service_providers 
SET 
  preferred_work_days = ARRAY[1,2,3,4,5],
  preferred_work_start_time = '09:00:00',
  preferred_work_end_time = '17:00:00',
  timezone = 'UTC',
  languages = ARRAY['english'],
  notification_preferences = '{"email": true, "sms": false, "push": true}'::jsonb,
  privacy_settings = '{"show_phone": true, "show_email": true, "show_address": false}'::jsonb
WHERE preferred_work_days IS NULL;

-- Add comments for documentation
COMMENT ON COLUMN public.service_providers.date_of_birth IS 'Provider date of birth for age verification';
COMMENT ON COLUMN public.service_providers.ssn IS 'Social Security Number (encrypted) for background checks';
COMMENT ON COLUMN public.service_providers.emergency_contact_name IS 'Emergency contact person name';
COMMENT ON COLUMN public.service_providers.emergency_contact_phone IS 'Emergency contact phone number';
COMMENT ON COLUMN public.service_providers.emergency_contact_email IS 'Emergency contact email address';
COMMENT ON COLUMN public.service_providers.profile_image_url IS 'URL to provider profile picture';
COMMENT ON COLUMN public.service_providers.bio IS 'Provider biography or description';
COMMENT ON COLUMN public.service_providers.skills IS 'Array of provider skills and qualifications';
COMMENT ON COLUMN public.service_providers.certifications IS 'Array of professional certifications';
COMMENT ON COLUMN public.service_providers.insurance_info IS 'Insurance details as JSON (liability, workers comp, etc.)';
COMMENT ON COLUMN public.service_providers.background_check_completed IS 'Whether background check has been completed';
COMMENT ON COLUMN public.service_providers.background_check_date IS 'Date when background check was completed';
COMMENT ON COLUMN public.service_providers.contract_type IS 'Type of employment contract';
COMMENT ON COLUMN public.service_providers.contract_start_date IS 'Contract start date';
COMMENT ON COLUMN public.service_providers.contract_end_date IS 'Contract end date (if applicable)';
COMMENT ON COLUMN public.service_providers.hourly_rate IS 'Base hourly rate for provider';
COMMENT ON COLUMN public.service_providers.currency IS 'Currency for rates and payments';
COMMENT ON COLUMN public.service_providers.tax_id IS 'Tax identification number';
COMMENT ON COLUMN public.service_providers.bank_account_info IS 'Bank account information (encrypted)';
COMMENT ON COLUMN public.service_providers.payout_method IS 'Preferred payout method';
COMMENT ON COLUMN public.service_providers.payout_frequency IS 'How often provider gets paid';
COMMENT ON COLUMN public.service_providers.payout_email IS 'Email for payout notifications';
COMMENT ON COLUMN public.service_providers.last_payout_date IS 'Date of last payout';
COMMENT ON COLUMN public.service_providers.total_earned IS 'Total amount earned by provider';
COMMENT ON COLUMN public.service_providers.total_paid_out IS 'Total amount paid to provider';
COMMENT ON COLUMN public.service_providers.current_balance IS 'Current balance owed to provider';
COMMENT ON COLUMN public.service_providers.availability_status IS 'Current availability status';
COMMENT ON COLUMN public.service_providers.preferred_work_days IS 'Days of week provider prefers to work';
COMMENT ON COLUMN public.service_providers.preferred_work_start_time IS 'Preferred start time for work';
COMMENT ON COLUMN public.service_providers.preferred_work_end_time IS 'Preferred end time for work';
COMMENT ON COLUMN public.service_providers.timezone IS 'Provider timezone for scheduling';
COMMENT ON COLUMN public.service_providers.languages IS 'Languages spoken by provider';
COMMENT ON COLUMN public.service_providers.vehicle_info IS 'Vehicle information for mobile services';
COMMENT ON COLUMN public.service_providers.equipment IS 'Equipment owned by provider';
COMMENT ON COLUMN public.service_providers.uniform_required IS 'Whether provider needs uniform';
COMMENT ON COLUMN public.service_providers.training_completed IS 'Whether initial training is completed';
COMMENT ON COLUMN public.service_providers.training_date IS 'Date when training was completed';
COMMENT ON COLUMN.service_providers.performance_score IS 'Internal performance score (0-100)';
COMMENT ON COLUMN public.service_providers.customer_rating IS 'Average customer rating';
COMMENT ON COLUMN public.service_providers.is_verified_provider IS 'Whether provider has been verified';
COMMENT ON COLUMN public.service_providers.verification_date IS 'Date when provider was verified';
COMMENT ON COLUMN public.service_providers.notes IS 'Public notes about provider';
COMMENT ON COLUMN public.service_providers.internal_notes IS 'Internal admin-only notes';
COMMENT ON COLUMN public.service_providers.last_active_at IS 'Last time provider was active';
COMMENT ON COLUMN public.service_providers.notification_preferences IS 'Notification settings as JSON';
COMMENT ON COLUMN public.service_providers.privacy_settings IS 'Privacy settings as JSON';
