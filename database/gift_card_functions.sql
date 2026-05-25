-- Gift Card Database Functions and Setup
-- This file contains the missing functions and policies for gift card functionality

-- =====================================================
-- GIFT CARD FUNCTIONS
-- =====================================================

-- Function to validate a gift card
CREATE OR REPLACE FUNCTION validate_gift_card(
    card_code TEXT,
    business_uuid UUID
)
RETURNS TABLE(
    valid BOOLEAN,
    instance_id UUID,
    current_balance NUMERIC,
    expires_at TIMESTAMPTZ,
    status TEXT,
    error_message TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    gift_instance RECORD;
BEGIN
    -- Find the gift card instance
    SELECT 
        gci.id,
        gci.current_balance,
        gci.expires_at,
        gci.status
    INTO gift_instance
    FROM gift_card_instances gci
    JOIN marketing_gift_cards mgc ON gci.gift_card_id = mgc.id
    WHERE gci.unique_code = card_code
    AND gci.business_id = business_uuid;
    
    -- Check if gift card exists
    IF NOT FOUND THEN
        RETURN QUERY SELECT 
            FALSE,
            NULL::UUID,
            NULL::NUMERIC,
            NULL::TIMESTAMPTZ,
            NULL::TEXT,
            'Gift card not found'::TEXT;
        RETURN;
    END IF;
    
    -- Check if gift card is expired
    IF gift_instance.expires_at < NOW() THEN
        RETURN QUERY SELECT 
            FALSE,
            gift_instance.id,
            gift_instance.current_balance,
            gift_instance.expires_at,
            gift_instance.status,
            'Gift card has expired'::TEXT;
        RETURN;
    END IF;
    
    -- Check if gift card is active
    IF gift_instance.status != 'active' THEN
        RETURN QUERY SELECT 
            FALSE,
            gift_instance.id,
            gift_instance.current_balance,
            gift_instance.expires_at,
            gift_instance.status,
            'Gift card is not active'::TEXT;
        RETURN;
    END IF;
    
    -- Gift card is valid
    RETURN QUERY SELECT 
        TRUE,
        gift_instance.id,
        gift_instance.current_balance,
        gift_instance.expires_at,
        gift_instance.status,
        NULL::TEXT;
    RETURN;
END;
$$;

-- Function to redeem a gift card
CREATE OR REPLACE FUNCTION redeem_gift_card(
    card_code TEXT,
    business_uuid UUID,
    redemption_amount NUMERIC,
    booking_uuid UUID DEFAULT NULL,
    customer_uuid UUID DEFAULT NULL,
    transaction_description TEXT DEFAULT NULL
)
RETURNS TABLE(
    success BOOLEAN,
    instance_id UUID,
    amount_redeemed NUMERIC,
    remaining_balance NUMERIC,
    transaction_id UUID,
    error_message TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    gift_instance RECORD;
    new_balance NUMERIC;
    transaction_record RECORD;
    validation_result RECORD;
BEGIN
    -- First validate the gift card
    SELECT * INTO validation_result FROM validate_gift_card(card_code, business_uuid);
    
    -- Check if gift card is valid
    IF NOT validation_result.valid THEN
        RETURN QUERY SELECT 
            FALSE,
            validation_result.instance_id,
            NULL::NUMERIC,
            NULL::NUMERIC,
            NULL::UUID,
            validation_result.error_message;
        RETURN;
    END IF;
    
    -- Check if there's sufficient balance
    IF validation_result.current_balance < redemption_amount THEN
        RETURN QUERY SELECT 
            FALSE,
            validation_result.instance_id,
            NULL::NUMERIC,
            validation_result.current_balance,
            NULL::UUID,
            'Insufficient balance'::TEXT;
        RETURN;
    END IF;
    
    -- Calculate new balance
    new_balance := validation_result.current_balance - redemption_amount;
    
    -- Update gift card balance and status
    UPDATE gift_card_instances 
    SET 
        current_balance = new_balance,
        status = CASE 
            WHEN new_balance = 0 THEN 'fully_redeemed'
            ELSE 'active'
        END,
        updated_at = NOW()
    WHERE id = validation_result.instance_id;
    
    -- Create transaction record
    INSERT INTO gift_card_transactions (
        business_id,
        gift_card_instance_id,
        transaction_type,
        amount,
        balance_before,
        balance_after,
        booking_id,
        customer_id,
        description,
        transaction_date
    ) VALUES (
        business_uuid,
        validation_result.instance_id,
        'redemption',
        redemption_amount,
        validation_result.current_balance,
        new_balance,
        booking_uuid,
        customer_uuid,
        transaction_description,
        NOW()
    ) RETURNING id INTO transaction_record;
    
    -- Return success
    RETURN QUERY SELECT 
        TRUE,
        validation_result.instance_id,
        redemption_amount,
        new_balance,
        transaction_record.id,
        NULL::TEXT;
    RETURN;
END;
$$;

-- =====================================================
-- RLS POLICIES FOR GIFT CARDS
-- =====================================================

-- Enable RLS on gift card tables if not already enabled
ALTER TABLE marketing_gift_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE gift_card_instances ENABLE ROW LEVEL SECURITY;
ALTER TABLE gift_card_transactions ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own business gift cards" ON marketing_gift_cards;
DROP POLICY IF EXISTS "Users can insert their own business gift cards" ON marketing_gift_cards;
DROP POLICY IF EXISTS "Users can update their own business gift cards" ON marketing_gift_cards;
DROP POLICY IF EXISTS "Users can delete their own business gift cards" ON marketing_gift_cards;

DROP POLICY IF EXISTS "Users can view their own business gift card instances" ON gift_card_instances;
DROP POLICY IF EXISTS "Users can insert their own business gift card instances" ON gift_card_instances;
DROP POLICY IF EXISTS "Users can update their own business gift card instances" ON gift_card_instances;
DROP POLICY IF EXISTS "Users can delete their own business gift card instances" ON gift_card_instances;

DROP POLICY IF EXISTS "Users can view their own business gift card transactions" ON gift_card_transactions;
DROP POLICY IF EXISTS "Users can insert their own business gift card transactions" ON gift_card_transactions;

-- Create RLS policies for marketing_gift_cards
CREATE POLICY "Users can view their own business gift cards" ON marketing_gift_cards
  FOR SELECT USING (auth.uid() IS NOT NULL AND business_id IN (
    SELECT id FROM public.businesses WHERE owner_id = auth.uid()
  ));

CREATE POLICY "Users can insert their own business gift cards" ON marketing_gift_cards
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL AND business_id IN (
    SELECT id FROM public.businesses WHERE owner_id = auth.uid()
  ));

CREATE POLICY "Users can update their own business gift cards" ON marketing_gift_cards
  FOR UPDATE USING (auth.uid() IS NOT NULL AND business_id IN (
    SELECT id FROM public.businesses WHERE owner_id = auth.uid()
  ));

CREATE POLICY "Users can delete their own business gift cards" ON marketing_gift_cards
  FOR DELETE USING (auth.uid() IS NOT NULL AND business_id IN (
    SELECT id FROM public.businesses WHERE owner_id = auth.uid()
  ));

-- Create RLS policies for gift_card_instances
CREATE POLICY "Users can view their own business gift card instances" ON gift_card_instances
  FOR SELECT USING (auth.uid() IS NOT NULL AND business_id IN (
    SELECT id FROM public.businesses WHERE owner_id = auth.uid()
  ));

CREATE POLICY "Users can insert their own business gift card instances" ON gift_card_instances
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL AND business_id IN (
    SELECT id FROM public.businesses WHERE owner_id = auth.uid()
  ));

CREATE POLICY "Users can update their own business gift card instances" ON gift_card_instances
  FOR UPDATE USING (auth.uid() IS NOT NULL AND business_id IN (
    SELECT id FROM public.businesses WHERE owner_id = auth.uid()
  ));

CREATE POLICY "Users can delete their own business gift card instances" ON gift_card_instances
  FOR DELETE USING (auth.uid() IS NOT NULL AND business_id IN (
    SELECT id FROM public.businesses WHERE owner_id = auth.uid()
  ));

-- Create RLS policies for gift_card_transactions
CREATE POLICY "Users can view their own business gift card transactions" ON gift_card_transactions
  FOR SELECT USING (auth.uid() IS NOT NULL AND business_id IN (
    SELECT id FROM public.businesses WHERE owner_id = auth.uid()
  ));

CREATE POLICY "Users can insert their own business gift card transactions" ON gift_card_transactions
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL AND business_id IN (
    SELECT id FROM public.businesses WHERE owner_id = auth.uid()
  ));

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_marketing_gift_cards_business_id ON marketing_gift_cards(business_id);
CREATE INDEX IF NOT EXISTS idx_marketing_gift_cards_active ON marketing_gift_cards(active);
CREATE INDEX IF NOT EXISTS idx_gift_card_instances_business_id ON gift_card_instances(business_id);
CREATE INDEX IF NOT EXISTS idx_gift_card_instances_unique_code ON gift_card_instances(unique_code);
CREATE INDEX IF NOT EXISTS idx_gift_card_instances_status ON gift_card_instances(status);
CREATE INDEX IF NOT EXISTS idx_gift_card_transactions_business_id ON gift_card_transactions(business_id);
CREATE INDEX IF NOT EXISTS idx_gift_card_transactions_instance_id ON gift_card_transactions(gift_card_instance_id);

-- =====================================================
-- GRANT PERMISSIONS
-- =====================================================

-- Grant permissions to authenticated users
GRANT ALL ON marketing_gift_cards TO authenticated;
GRANT ALL ON gift_card_instances TO authenticated;
GRANT ALL ON gift_card_transactions TO authenticated;

-- Grant execute permissions on functions
GRANT EXECUTE ON FUNCTION validate_gift_card TO authenticated;
GRANT EXECUTE ON FUNCTION redeem_gift_card TO authenticated;

-- Grant select permissions to anonymous users for validation (needed for public redemption)
GRANT SELECT ON marketing_gift_cards TO anon;
GRANT SELECT ON gift_card_instances TO anon;
GRANT EXECUTE ON FUNCTION validate_gift_card TO anon;

-- =====================================================
-- SAMPLE DATA (OPTIONAL - FOR TESTING)
-- =====================================================

-- Uncomment the following section to create sample gift card data for testing
/*
-- Sample gift card template
INSERT INTO marketing_gift_cards (business_id, name, description, code, amount, active, expires_in_months, auto_generate_codes)
SELECT 
    id,
    'Sample Gift Card',
    'A sample gift card for testing',
    'SAMPLE',
    50.00,
    true,
    12,
    true
FROM businesses 
LIMIT 1;

-- Sample gift card instance
INSERT INTO gift_card_instances (
    business_id, 
    gift_card_id, 
    unique_code, 
    original_amount, 
    current_balance, 
    purchase_date, 
    expires_at, 
    status
)
SELECT 
    b.id,
    gc.id,
    'TEST123',
    50.00,
    50.00,
    NOW(),
    NOW() + INTERVAL '12 months',
    'active'
FROM businesses b
CROSS JOIN marketing_gift_cards gc
WHERE b.id = gc.business_id
LIMIT 1;
*/
