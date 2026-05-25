-- Create bookings table for customer booking data
CREATE TABLE IF NOT EXISTS bookings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
  business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
  service_id TEXT NOT NULL,
  service_name TEXT NOT NULL,
  provider_id UUID REFERENCES providers(id) ON DELETE SET NULL,
  provider_name TEXT DEFAULT '',
  frequency TEXT DEFAULT 'One-time',
  date DATE NOT NULL,
  time TEXT NOT NULL,
  status TEXT DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'completed', 'canceled')),
  address TEXT NOT NULL,
  contact TEXT NOT NULL,
  notes TEXT DEFAULT '',
  price DECIMAL(10,2) DEFAULT 0,
  tip_amount DECIMAL(10,2),
  tip_updated_at TIMESTAMP,
  
  -- Customization data as JSON
  customization JSONB DEFAULT '{}',
  
  -- Metadata
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  -- Business isolation
  tenant_id UUID DEFAULT (public.uuid_generate_v4())
);

-- Add missing columns if they don't exist (for existing tables)
DO $$
BEGIN
    -- Add customization column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'bookings' AND column_name = 'customization') THEN
        ALTER TABLE bookings ADD COLUMN customization JSONB DEFAULT '{}';
    END IF;
    
    -- Add created_at column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'bookings' AND column_name = 'created_at') THEN
        ALTER TABLE bookings ADD COLUMN created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
    END IF;
    
    -- Add updated_at column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'bookings' AND column_name = 'updated_at') THEN
        ALTER TABLE bookings ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
    END IF;
    
    -- Add tenant_id column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'bookings' AND column_name = 'tenant_id') THEN
        ALTER TABLE bookings ADD COLUMN tenant_id UUID DEFAULT (public.uuid_generate_v4());
    END IF;
    
    -- Add tip_updated_at column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'bookings' AND column_name = 'tip_updated_at') THEN
        ALTER TABLE bookings ADD COLUMN tip_updated_at TIMESTAMP;
    END IF;
END $$;

-- Create indexes for performance (safe to run multiple times)
CREATE INDEX IF NOT EXISTS idx_bookings_customer_id ON bookings(customer_id);
CREATE INDEX IF NOT EXISTS idx_bookings_business_id ON bookings(business_id);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status);
CREATE INDEX IF NOT EXISTS idx_bookings_date ON bookings(date);
CREATE INDEX IF NOT EXISTS idx_bookings_tenant_id ON bookings(tenant_id);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_bookings_updated_at 
    BEFORE UPDATE ON bookings 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security (RLS)
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (safe to run multiple times)
DROP POLICY IF EXISTS "Customers can view own bookings" ON bookings;
DROP POLICY IF EXISTS "Customers can insert own bookings" ON bookings;
DROP POLICY IF EXISTS "Customers can update own bookings" ON bookings;
DROP POLICY IF EXISTS "Businesses can view business bookings" ON bookings;
DROP POLICY IF EXISTS "Businesses can update business bookings" ON bookings;

-- Policy: Customers can only access their own bookings
CREATE POLICY "Customers can view own bookings" ON bookings
    FOR SELECT USING (auth.uid() = customer_id);

-- Policy: Customers can insert their own bookings
CREATE POLICY "Customers can insert own bookings" ON bookings
    FOR INSERT WITH CHECK (auth.uid() = customer_id);

-- Policy: Customers can update their own bookings
CREATE POLICY "Customers can update own bookings" ON bookings
    FOR UPDATE USING (auth.uid() = customer_id);

-- Policy: Businesses can view bookings for their business
CREATE POLICY "Businesses can view business bookings" ON bookings
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM business_users 
            WHERE business_users.business_id = bookings.business_id 
            AND business_users.user_id = auth.uid()
        )
    );

-- Policy: Businesses can update bookings for their business
CREATE POLICY "Businesses can update business bookings" ON bookings
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM business_users 
            WHERE business_users.business_id = bookings.business_id 
            AND business_users.user_id = auth.uid()
        )
    );
