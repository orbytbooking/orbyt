-- Fix customer ID generation to handle custom IDs from frontend
-- This allows the database to auto-generate UUIDs when invalid IDs are provided

-- Create a function to handle ID generation
CREATE OR REPLACE FUNCTION generate_customer_id()
RETURNS TRIGGER AS $$
BEGIN
  -- If ID is not a valid UUID, generate one automatically
  IF NEW.id IS NULL OR NEW.id::text ~ '^[0-9A-Fa-f]{8}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{12}$' IS FALSE THEN
    NEW.id := gen_random_uuid();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS trigger_generate_customer_id ON customers;

-- Create trigger to auto-generate UUIDs
CREATE TRIGGER trigger_generate_customer_id
  BEFORE INSERT ON customers
  FOR EACH ROW
  EXECUTE FUNCTION generate_customer_id();

-- Alternative: Remove ID requirement from insert and let database generate
-- This is the safer approach
ALTER TABLE customers ALTER COLUMN id DROP DEFAULT;
ALTER TABLE customers ALTER COLUMN id SET DEFAULT gen_random_uuid();

-- Comments
COMMENT ON FUNCTION generate_customer_id() IS 'Auto-generates UUID for customers when invalid ID is provided';
COMMENT ON TRIGGER trigger_generate_customer_id ON customers IS 'Ensures customer ID is always a valid UUID';
