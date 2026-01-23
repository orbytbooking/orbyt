-- Fix bookings table NOT NULL constraints for scheduled_date and scheduled_time

-- First, make the columns nullable by dropping NOT NULL constraints
ALTER TABLE bookings ALTER COLUMN scheduled_date DROP NOT NULL;
ALTER TABLE bookings ALTER COLUMN scheduled_time DROP NOT NULL;

-- Also make other potentially problematic columns nullable
ALTER TABLE bookings ALTER COLUMN customer_id DROP NOT NULL;
ALTER TABLE bookings ALTER COLUMN provider_id DROP NOT NULL;

-- Add the missing columns if they don't exist
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS amount DECIMAL(10,2);
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS business_id UUID REFERENCES businesses(id) ON DELETE CASCADE;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS customer_email TEXT;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS customer_name TEXT;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS customer_phone TEXT;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS service TEXT;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS date DATE;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS time TIME;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS payment_method TEXT;

-- Update scheduled_date and scheduled_time from the new date/time columns
UPDATE bookings SET scheduled_date = date WHERE scheduled_date IS NULL AND date IS NOT NULL;
UPDATE bookings SET scheduled_time = time WHERE scheduled_time IS NULL AND time IS NOT NULL;

-- Copy total_price to amount if amount is null
UPDATE bookings SET amount = total_price WHERE amount IS NULL AND total_price IS NOT NULL;
