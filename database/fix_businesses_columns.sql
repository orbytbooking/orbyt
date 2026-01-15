-- Add missing columns to existing businesses table

-- Add is_active column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'businesses' 
        AND column_name = 'is_active'
    ) THEN
        ALTER TABLE businesses ADD COLUMN is_active BOOLEAN DEFAULT true;
        RAISE NOTICE 'Added is_active column to businesses table';
    END IF;
END $$;

-- Add updated_at column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'businesses' 
        AND column_name = 'updated_at'
    ) THEN
        ALTER TABLE businesses ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
        RAISE NOTICE 'Added updated_at column to businesses table';
    END IF;
END $$;

-- Add created_at column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'businesses' 
        AND column_name = 'created_at'
    ) THEN
        ALTER TABLE businesses ADD COLUMN created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
        RAISE NOTICE 'Added created_at column to businesses table';
    END IF;
END $$;

-- Create trigger for updated_at if it doesn't exist
DROP TRIGGER IF EXISTS trigger_update_businesses_updated_at ON businesses;

CREATE OR REPLACE FUNCTION update_businesses_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_businesses_updated_at
  BEFORE UPDATE ON businesses
  FOR EACH ROW
  EXECUTE FUNCTION update_businesses_updated_at();

-- Enable RLS if not already enabled
ALTER TABLE businesses ENABLE ROW LEVEL SECURITY;

-- Create/update RLS policies
DROP POLICY IF EXISTS "Users can view their own businesses" ON businesses;
CREATE POLICY "Users can view their own businesses" ON businesses
  FOR SELECT USING (owner_id = auth.uid());

DROP POLICY IF EXISTS "Users can insert their own businesses" ON businesses;
CREATE POLICY "Users can insert their own businesses" ON businesses
  FOR INSERT WITH CHECK (owner_id = auth.uid());

DROP POLICY IF EXISTS "Users can update their own businesses" ON businesses;
CREATE POLICY "Users can update their own businesses" ON businesses
  FOR UPDATE USING (owner_id = auth.uid());

DROP POLICY IF EXISTS "Users can delete their own businesses" ON businesses;
CREATE POLICY "Users can delete their own businesses" ON businesses
  FOR DELETE USING (owner_id = auth.uid());

-- Create indexes if they don't exist
CREATE INDEX IF NOT EXISTS idx_businesses_owner_id ON businesses(owner_id);
CREATE INDEX IF NOT EXISTS idx_businesses_category ON businesses(category);
CREATE INDEX IF NOT EXISTS idx_businesses_plan ON businesses(plan);
CREATE INDEX IF NOT EXISTS idx_businesses_is_active ON businesses(is_active);

-- Set default values for existing rows
UPDATE businesses SET is_active = true WHERE is_active IS NULL;
UPDATE businesses SET created_at = NOW() WHERE created_at IS NULL;
UPDATE businesses SET updated_at = NOW() WHERE updated_at IS NULL;

RAISE NOTICE 'Businesses table schema updated successfully';
