-- Customers table for multi-tenant CRM system
-- Fixed version with proper constraints

CREATE TABLE IF NOT EXISTS customers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email VARCHAR NOT NULL,
  name VARCHAR NOT NULL,
  phone VARCHAR,
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  
  -- Address information
  address TEXT,
  
  -- Customer metrics
  join_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  total_bookings INTEGER DEFAULT 0,
  total_spent NUMERIC(10,2) DEFAULT 0.00,
  last_booking TIMESTAMP WITH TIME ZONE,
  
  -- Status management
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Unique constraint per business
  UNIQUE(business_id, email)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_customers_business_id ON customers(business_id);
CREATE INDEX IF NOT EXISTS idx_customers_email ON customers(email);
CREATE INDEX IF NOT EXISTS idx_customers_status ON customers(status);
CREATE INDEX IF NOT EXISTS idx_customers_created_at ON customers(created_at);
CREATE INDEX IF NOT EXISTS idx_customers_last_booking ON customers(last_booking);

-- Enable RLS
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Business users can view their own customers" ON customers
  FOR SELECT USING (business_id IN (SELECT id FROM businesses WHERE owner_id = auth.uid()));

CREATE POLICY "Business users can insert their own customers" ON customers
  FOR INSERT WITH CHECK (business_id IN (SELECT id FROM businesses WHERE owner_id = auth.uid()));

CREATE POLICY "Business users can update their own customers" ON customers
  FOR UPDATE USING (business_id IN (SELECT id FROM businesses WHERE owner_id = auth.uid()));

CREATE POLICY "Business users can delete their own customers" ON customers
  FOR DELETE USING (business_id IN (SELECT id FROM businesses WHERE owner_id = auth.uid()));

-- Function to automatically update updated_at
CREATE OR REPLACE FUNCTION update_customers_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for updated_at
CREATE TRIGGER trigger_update_customers_updated_at
  BEFORE UPDATE ON customers
  FOR EACH ROW
  EXECUTE FUNCTION update_customers_updated_at();

-- Function to update customer metrics when booking is created/updated
CREATE OR REPLACE FUNCTION update_customer_metrics()
RETURNS TRIGGER AS $$
BEGIN
  -- Update total_bookings and total_spent for the customer
  UPDATE customers 
  SET 
    total_bookings = (
      SELECT COUNT(*) 
      FROM bookings 
      WHERE customer_id = NEW.customer_id AND status = 'completed'
    ),
    total_spent = (
      SELECT COALESCE(SUM(amount), 0) 
      FROM bookings 
      WHERE customer_id = NEW.customer_id AND status = 'completed'
    ),
    last_booking = (
      SELECT MAX(created_at) 
      FROM bookings 
      WHERE customer_id = NEW.customer_id
    )
  WHERE id = NEW.customer_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers to update customer metrics
CREATE TRIGGER trigger_update_customer_metrics_on_insert
  AFTER INSERT ON bookings
  FOR EACH ROW
  EXECUTE FUNCTION update_customer_metrics();

CREATE TRIGGER trigger_update_customer_metrics_on_update
  AFTER UPDATE ON bookings
  FOR EACH ROW
  EXECUTE FUNCTION update_customer_metrics();

CREATE TRIGGER trigger_update_customer_metrics_on_delete
  AFTER DELETE ON bookings
  FOR EACH ROW
  EXECUTE FUNCTION update_customer_metrics();

-- Comments
COMMENT ON TABLE customers IS 'Customers table with proper business isolation and metric tracking';
COMMENT ON COLUMN customers.business_id IS 'Foreign key to businesses table - required for multi-tenant isolation';
COMMENT ON COLUMN customers.total_bookings IS 'Automatically updated count of completed bookings';
COMMENT ON COLUMN customers.total_spent IS 'Automatically updated total amount spent on completed bookings';
