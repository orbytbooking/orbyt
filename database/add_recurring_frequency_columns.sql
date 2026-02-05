-- Add recurring frequency columns to industry_frequency table
-- These columns are needed for the frontend form functionality

ALTER TABLE public.industry_frequency 
ADD COLUMN IF NOT EXISTS frequency_repeats text NULL,
ADD COLUMN IF NOT EXISTS shorter_job_length text NULL,
ADD COLUMN IF NOT EXISTS shorter_job_length_by text NULL,
ADD COLUMN IF NOT EXISTS exclude_first_appointment boolean NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS frequency_discount text NULL,
ADD COLUMN IF NOT EXISTS charge_one_time_price boolean NULL DEFAULT false;

-- Add comments for the new columns
COMMENT ON COLUMN public.industry_frequency.frequency_repeats IS 'How often the frequency repeats (e.g., daily, weekly, monthly)';
COMMENT ON COLUMN public.industry_frequency.shorter_job_length IS 'Whether the job length is shorter for recurring appointments';
COMMENT ON COLUMN public.industry_frequency.shorter_job_length_by IS 'Percentage by which the job length is reduced';
COMMENT ON COLUMN public.industry_frequency.exclude_first_appointment IS 'Whether to exclude first appointment from shorter length';
COMMENT ON COLUMN public.industry_frequency.frequency_discount IS 'How the frequency discount is applied';
COMMENT ON COLUMN public.industry_frequency.charge_one_time_price IS 'Whether to charge one-time price if cancelled after first appointment';
