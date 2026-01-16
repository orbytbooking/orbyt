-- Migration to fix critical issues in bookings table
-- This addresses the data type mismatches and redundant columns

-- Step 1: Add proper UUID customer_id column if it doesn't exist
DO $$
BEGIN
  -- Check if customer_id column exists and is text type
  IF EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'bookings' 
    AND column_name = 'customer_id' 
    AND data_type = 'text'
  ) THEN
    -- Create temporary UUID column
    ALTER TABLE bookings ADD COLUMN IF NOT EXISTS customer_id_uuid UUID;
    
    -- Try to migrate data from existing customer relationships
    -- This assumes customer_email matches customers.email
    UPDATE bookings b
    SET customer_id_uuid = c.id
    FROM customers c
    WHERE b.customer_email = c.email 
    AND b.business_id = c.business_id;
    
    -- Drop old text column and rename UUID column
    ALTER TABLE bookings DROP COLUMN customer_id;
    ALTER TABLE bookings RENAME COLUMN customer_id_uuid TO customer_id;
    
    -- Add NOT NULL constraint if we have data
    -- ALTER TABLE bookings ALTER COLUMN customer_id SET NOT NULL;
  END IF;
END $$;

-- Step 2: Add proper foreign key constraint if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.table_constraints 
    WHERE constraint_name = 'bookings_customer_id_fkey'
    AND table_name = 'bookings'
  ) THEN
    ALTER TABLE bookings 
    ADD CONSTRAINT bookings_customer_id_fkey 
    FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Step 3: Consolidate duplicate columns
-- Update scheduled_date from date column
UPDATE bookings 
SET scheduled_date = date 
WHERE scheduled_date IS NULL AND date IS NOT NULL;

-- Update scheduled_time from time column  
UPDATE bookings 
SET scheduled_time = time 
WHERE scheduled_time IS NULL AND time IS NOT NULL;

-- Update amount from total_price column
UPDATE bookings 
SET amount = total_price 
WHERE amount IS NULL AND total_price IS NOT NULL;

-- Step 4: Drop redundant columns (commented out - uncomment when ready)
-- ALTER TABLE bookings DROP COLUMN IF EXISTS date;
-- ALTER TABLE bookings DROP COLUMN IF EXISTS time;
-- ALTER TABLE bookings DROP COLUMN IF EXISTS total_price;

-- Step 5: Add missing business_id foreign key if not present
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.table_constraints 
    WHERE constraint_name = 'customers_business_id_fkey'
    AND table_name = 'customers'
  ) THEN
    ALTER TABLE customers 
    ADD CONSTRAINT customers_business_id_fkey 
    FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Step 6: Add unique constraint for customers per business
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.table_constraints 
    WHERE constraint_name = 'customers_business_email_unique'
    AND table_name = 'customers'
  ) THEN
    ALTER TABLE customers 
    ADD CONSTRAINT customers_business_email_unique 
    UNIQUE(business_id, email);
  END IF;
END $$;

-- Step 7: Create indexes if they don't exist
CREATE INDEX IF NOT EXISTS idx_bookings_customer_id ON bookings(customer_id);
CREATE INDEX IF NOT EXISTS idx_customers_business_id ON customers(business_id);
CREATE INDEX IF NOT EXISTS idx_customers_email ON customers(email);

-- Step 8: Enable RLS if not enabled
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.table_privileges 
    WHERE table_name = 'bookings' 
    AND privilege_type = 'SELECT'
    AND grantee = 'authenticated'
  ) THEN
    ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
    ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;

-- Comments for documentation
COMMENT ON COLUMN bookings.customer_id IS 'Fixed to UUID type with proper foreign key constraint';
COMMENT ON COLUMN customers.business_id IS 'Foreign key to businesses table with proper constraint';
