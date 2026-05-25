-- Add variables support to industry_exclude_parameter table
-- This migration adds show_based_on_variables and variables columns

-- Add show_based_on_variables column
ALTER TABLE public.industry_exclude_parameter 
ADD COLUMN IF NOT EXISTS show_based_on_variables boolean NULL DEFAULT false;

-- Add variables column to store selected variables as JSON object
-- If the column already exists as text, we need to drop and recreate it as jsonb
DO $$ 
BEGIN
    -- Check if column exists
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'industry_exclude_parameter' 
        AND column_name = 'variables'
    ) THEN
        -- Drop the existing text column
        ALTER TABLE public.industry_exclude_parameter DROP COLUMN variables;
    END IF;
    
    -- Add the column as jsonb
    ALTER TABLE public.industry_exclude_parameter 
    ADD COLUMN variables jsonb NULL DEFAULT '{}'::jsonb;
END $$;

-- Add comments for documentation
COMMENT ON COLUMN public.industry_exclude_parameter.show_based_on_variables IS 'Whether to show this parameter based on selected variables';
COMMENT ON COLUMN public.industry_exclude_parameter.variables IS 'JSON object mapping variable categories to arrays of selected variable names';
