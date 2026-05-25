-- Add maximum_quantity field to industry_extras table
-- This allows setting quantity limits for extras in the admin form

-- Add maximum_quantity column to industry_extras table
ALTER TABLE public.industry_extras 
ADD COLUMN maximum_quantity INTEGER;

-- Create index for better performance on business_id and industry_id
CREATE INDEX IF NOT EXISTS idx_industry_extras_business_id 
ON public.industry_extras (business_id);

-- Create index for better performance on industry_id  
CREATE INDEX IF NOT EXISTS idx_industry_extras_industry_id 
ON public.industry_extras (industry_id);

-- Create index for sort_order performance
CREATE INDEX IF NOT EXISTS idx_industry_extras_sort_order 
ON public.industry_extras (sort_order);

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS trigger_update_industry_extras_updated_at ON public.industry_extras;

-- Create trigger to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_industry_extras_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_industry_extras_updated_at
BEFORE UPDATE ON public.industry_extras
FOR EACH ROW
EXECUTE FUNCTION update_industry_extras_updated_at();
