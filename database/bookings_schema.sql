-- Bookings table for multi-tenant CRM system
-- Fixed version with proper data types and constraints

CREATE TABLE IF NOT EXISTS bookings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  provider_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  service_id UUID NOT NULL REFERENCES services(id) ON DELETE CASCADE,
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  
  -- Status with proper constraints
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'in_progress', 'completed', 'cancelled')),
  
  -- Scheduling (using single set of columns)
  scheduled_date DATE,
  scheduled_time TIME WITHOUT TIME ZONE,
  
  -- Location details
  address TEXT NOT NULL,
  apt_no TEXT,
  zip_code TEXT,
  
  -- Service details
  service TEXT, -- Denormalized for easy display
  notes TEXT,
  
  -- Pricing (using single amount column)
  amount NUMERIC(10,2) NOT NULL DEFAULT 0,
  tip_amount NUMERIC(10,2) DEFAULT 0,
  tip_updated_at TIMESTAMP WITH TIME ZONE,
  
  -- Payment
  payment_method TEXT CHECK (payment_method IN ('cash', 'online')),
  payment_status TEXT DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'refunded')),
  
  -- Customer details (denormalized for performance)
  customer_email TEXT,
  customer_name TEXT,
  customer_phone TEXT,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_bookings_customer_id ON bookings(customer_id);
CREATE INDEX IF NOT EXISTS idx_bookings_provider_id ON bookings(provider_id);
CREATE INDEX IF NOT EXISTS idx_bookings_business_id ON bookings(business_id);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status);
CREATE INDEX IF NOT EXISTS idx_bookings_scheduled_date ON bookings(scheduled_date);
CREATE INDEX IF NOT EXISTS idx_bookings_created_at ON bookings(created_at);

-- Enable RLS
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Business users can view their own bookings" ON bookings
  FOR SELECT USING (business_id IN (SELECT id FROM businesses WHERE owner_id = auth.uid()));

CREATE POLICY "Business users can insert their own bookings" ON bookings
  FOR INSERT WITH CHECK (business_id IN (SELECT id FROM businesses WHERE owner_id = auth.uid()));

CREATE POLICY "Business users can update their own bookings" ON bookings
  FOR UPDATE USING (business_id IN (SELECT id FROM businesses WHERE owner_id = auth.uid()));

CREATE POLICY "Business users can delete their own bookings" ON bookings
  FOR DELETE USING (business_id IN (SELECT id FROM businesses WHERE owner_id = auth.uid()));

-- Function to automatically update updated_at
CREATE OR REPLACE FUNCTION update_bookings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for updated_at
CREATE TRIGGER trigger_update_bookings_updated_at
  BEFORE UPDATE ON bookings
  FOR EACH ROW
  EXECUTE FUNCTION update_bookings_updated_at();

-- Comments
COMMENT ON TABLE bookings IS 'Bookings table with proper foreign key constraints and multi-tenant support';
COMMENT ON COLUMN bookings.customer_id IS 'Foreign key to customers table - fixed to UUID type';
COMMENT ON COLUMN bookings.amount IS 'Booking amount - replaces total_price for consistency';
