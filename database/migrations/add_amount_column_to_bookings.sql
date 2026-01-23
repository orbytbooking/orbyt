-- Add missing columns to bookings table to fix booking creation error
-- The application code is sending these fields but they don't exist in the table

-- Add amount column if it doesn't exist
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS amount DECIMAL(10,2);

-- If total_price exists, copy its values to amount
UPDATE bookings SET amount = total_price WHERE amount IS NULL AND total_price IS NOT NULL;

-- Add comment for the amount column
COMMENT ON COLUMN bookings.amount IS 'Booking amount - matches total_price for compatibility';

-- Add business_id column to bookings table
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS business_id UUID REFERENCES businesses(id) ON DELETE CASCADE;

-- Add customer_email column to bookings table
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS customer_email TEXT;

-- Add customer_name column to bookings table
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS customer_name TEXT;

-- Add customer_phone column to bookings table
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS customer_phone TEXT;

-- Add service column to bookings table
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS service TEXT;

-- Add date column to bookings table (map to scheduled_date)
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS date DATE;

-- Update scheduled_date with date values when date is provided
UPDATE bookings SET scheduled_date = date WHERE scheduled_date IS NULL AND date IS NOT NULL;

-- Make scheduled_date nullable to fix not-null constraint error
ALTER TABLE bookings ALTER COLUMN scheduled_date DROP NOT NULL;

-- Add time column to bookings table (map to scheduled_time)
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS time TIME;

-- Update scheduled_time with time values when time is provided
UPDATE bookings SET scheduled_time = time WHERE scheduled_time IS NULL AND time IS NOT NULL;

-- Make scheduled_time nullable to fix not-null constraint error
ALTER TABLE bookings ALTER COLUMN scheduled_time DROP NOT NULL;

-- Add notes column to bookings table
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS notes TEXT;

-- Add payment_method column to bookings table
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS payment_method TEXT;
