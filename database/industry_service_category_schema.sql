-- Industry Service Category Schema
-- This table stores service categories for each industry with all their configuration options

CREATE TABLE IF NOT EXISTS industry_service_category (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  industry_id UUID NOT NULL REFERENCES industries(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  color TEXT,
  icon TEXT,
  
  -- Display settings
  display TEXT DEFAULT 'customer_frontend_backend_admin' CHECK (display IN ('customer_frontend_backend_admin', 'customer_backend_admin', 'admin_only')),
  display_service_length_customer TEXT DEFAULT 'admin_only' CHECK (display_service_length_customer IN ('customer_frontend_backend_admin', 'customer_backend_admin', 'admin_only')),
  display_service_length_provider BOOLEAN DEFAULT false,
  can_customer_edit_service BOOLEAN DEFAULT false,
  service_fee_enabled BOOLEAN DEFAULT false,
  
  -- Frequency settings
  service_category_frequency BOOLEAN DEFAULT false,
  selected_frequencies TEXT[], -- Array of frequency strings
  
  -- Variables (stored as JSONB for flexibility)
  variables JSONB DEFAULT '{}',
  
  -- Exclude parameters
  exclude_parameters JSONB DEFAULT '{"pets": false, "smoking": false, "deepCleaning": false}',
  selected_exclude_parameters TEXT[],
  
  -- Extras
  extras INTEGER[],
  extras_config JSONB DEFAULT '{"tip": {"enabled": false, "saveTo": "all", "display": "customer_frontend_backend_admin"}, "parking": {"enabled": false, "saveTo": "all", "display": "customer_frontend_backend_admin"}}',
  
  -- Expedited charge
  expedited_charge JSONB DEFAULT '{"enabled": false, "amount": "", "displayText": "", "currency": "$"}',
  
  -- Cancellation fee
  cancellation_fee JSONB DEFAULT '{"enabled": false, "type": "single", "fee": "", "currency": "$", "payProvider": false, "providerFee": "", "providerCurrency": "$", "chargeTiming": "beforeDay", "beforeDayTime": "", "hoursBefore": ""}',
  
  -- Hourly service
  hourly_service JSONB DEFAULT '{"enabled": false, "price": "", "currency": "$", "priceCalculationType": "customTime", "countExtrasSeparately": false}',
  
  -- Service category price
  service_category_price JSONB DEFAULT '{"enabled": false, "price": "", "currency": "$"}',
  
  -- Service category time
  service_category_time JSONB DEFAULT '{"enabled": false, "hours": "0", "minutes": "0"}',
  
  -- Minimum price
  minimum_price JSONB DEFAULT '{"enabled": false, "checkAmountType": "discounted", "price": "", "checkRecurringSchedule": false, "textToDisplay": false, "noticeText": ""}',
  
  -- Override provider pay
  override_provider_pay JSONB DEFAULT '{"enabled": false, "amount": "", "currency": "$"}',
  
  -- Excluded providers
  excluded_providers TEXT[],
  
  -- Sort order
  sort_order INTEGER DEFAULT 0,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_industry_service_category_business_id ON industry_service_category(business_id);
CREATE INDEX IF NOT EXISTS idx_industry_service_category_industry_id ON industry_service_category(industry_id);
CREATE INDEX IF NOT EXISTS idx_industry_service_category_sort_order ON industry_service_category(sort_order);

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_industry_service_category_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_industry_service_category_updated_at
  BEFORE UPDATE ON industry_service_category
  FOR EACH ROW
  EXECUTE FUNCTION update_industry_service_category_updated_at();

-- Row Level Security (RLS) Policies
ALTER TABLE industry_service_category ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view service categories for their business
CREATE POLICY "Users can view their business service categories"
  ON industry_service_category
  FOR SELECT
  USING (
    business_id IN (
      SELECT id FROM businesses WHERE owner_id = auth.uid()
    )
  );

-- Policy: Users can insert service categories for their business
CREATE POLICY "Users can insert service categories for their business"
  ON industry_service_category
  FOR INSERT
  WITH CHECK (
    business_id IN (
      SELECT id FROM businesses WHERE owner_id = auth.uid()
    )
  );

-- Policy: Users can update service categories for their business
CREATE POLICY "Users can update their business service categories"
  ON industry_service_category
  FOR UPDATE
  USING (
    business_id IN (
      SELECT id FROM businesses WHERE owner_id = auth.uid()
    )
  );

-- Policy: Users can delete service categories for their business
CREATE POLICY "Users can delete their business service categories"
  ON industry_service_category
  FOR DELETE
  USING (
    business_id IN (
      SELECT id FROM businesses WHERE owner_id = auth.uid()
    )
  );
