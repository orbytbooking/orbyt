-- Add timezone column to provider_preferences table
-- This migration adds timezone support for provider availability settings

-- Add timezone column to provider_preferences table
ALTER TABLE public.provider_preferences 
ADD COLUMN timezone TEXT DEFAULT 'Asia/Manila';

-- Add comment
COMMENT ON COLUMN public.provider_preferences.timezone IS 'Provider timezone for availability calculations';

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_provider_preferences_timezone ON public.provider_preferences(timezone);

-- Update existing records to have default timezone
UPDATE public.provider_preferences 
SET timezone = 'Asia/Manila' 
WHERE timezone IS NULL;
