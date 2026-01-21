-- Marketing Gift Cards Table for Supabase (with multitenancy)
-- This table stores gift card templates/designs that can be purchased
CREATE TABLE IF NOT EXISTS marketing_gift_cards (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    name text NOT NULL,
    description text,
    code text NOT NULL, -- Unique code for this gift card type
    amount numeric NOT NULL, -- Face value of the gift card
    active boolean DEFAULT true,
    expires_in_months integer DEFAULT 12, -- How many months after purchase the card expires
    auto_generate_codes boolean DEFAULT true, -- Whether to generate unique codes for each purchase
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Gift Card Instances Table - tracks individual purchased gift cards
CREATE TABLE IF NOT EXISTS gift_card_instances (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    gift_card_id uuid NOT NULL REFERENCES marketing_gift_cards(id) ON DELETE CASCADE,
    unique_code text NOT NULL UNIQUE, -- Unique redemption code for this specific card
    original_amount numeric NOT NULL, -- Original purchase amount
    current_balance numeric NOT NULL, -- Current remaining balance
    purchaser_id uuid REFERENCES customers(id) ON DELETE SET NULL, -- Who bought this gift card
    recipient_id uuid REFERENCES customers(id) ON DELETE SET NULL, -- Who received this gift card (if different)
    purchaser_email text, -- Email of purchaser (if not a registered customer)
    recipient_email text, -- Email of recipient (if different from purchaser)
    purchase_date timestamptz DEFAULT now(),
    expires_at timestamptz, -- When this specific card expires
    status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'expired', 'fully_redeemed', 'cancelled')),
    message text, -- Personal message from purchaser to recipient
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Gift Card Transactions Table - tracks all gift card usage
CREATE TABLE IF NOT EXISTS gift_card_transactions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    gift_card_instance_id uuid NOT NULL REFERENCES gift_card_instances(id) ON DELETE CASCADE,
    transaction_type text NOT NULL CHECK (transaction_type IN ('purchase', 'redemption', 'refund', 'adjustment')),
    amount numeric NOT NULL, -- Amount of this transaction (positive for purchase/refund, negative for redemption)
    balance_before numeric NOT NULL, -- Balance before this transaction
    balance_after numeric NOT NULL, -- Balance after this transaction
    booking_id uuid REFERENCES bookings(id) ON DELETE SET NULL, -- Associated booking if redeemed
    customer_id uuid REFERENCES customers(id) ON DELETE SET NULL, -- Customer who used the card
    description text, -- Description of the transaction
    processed_by uuid REFERENCES users(id) ON DELETE SET NULL, -- Staff member who processed the transaction
    transaction_date timestamptz DEFAULT now(),
    created_at timestamptz DEFAULT now()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_marketing_gift_cards_business_id ON marketing_gift_cards(business_id);
CREATE INDEX IF NOT EXISTS idx_marketing_gift_cards_code ON marketing_gift_cards(code);
CREATE INDEX IF NOT EXISTS idx_marketing_gift_cards_active ON marketing_gift_cards(active);

CREATE INDEX IF NOT EXISTS idx_gift_card_instances_business_id ON gift_card_instances(business_id);
CREATE INDEX IF NOT EXISTS idx_gift_card_instances_gift_card_id ON gift_card_instances(gift_card_id);
CREATE INDEX IF NOT EXISTS idx_gift_card_instances_unique_code ON gift_card_instances(unique_code);
CREATE INDEX IF NOT EXISTS idx_gift_card_instances_status ON gift_card_instances(status);
CREATE INDEX IF NOT EXISTS idx_gift_card_instances_expires_at ON gift_card_instances(expires_at);
CREATE INDEX IF NOT EXISTS idx_gift_card_instances_purchaser_email ON gift_card_instances(purchaser_email);
CREATE INDEX IF NOT EXISTS idx_gift_card_instances_recipient_email ON gift_card_instances(recipient_email);

CREATE INDEX IF NOT EXISTS idx_gift_card_transactions_business_id ON gift_card_transactions(business_id);
CREATE INDEX IF NOT EXISTS idx_gift_card_transactions_gift_card_instance_id ON gift_card_transactions(gift_card_instance_id);
CREATE INDEX IF NOT EXISTS idx_gift_card_transactions_transaction_type ON gift_card_transactions(transaction_type);
CREATE INDEX IF NOT EXISTS idx_gift_card_transactions_booking_id ON gift_card_transactions(booking_id);
CREATE INDEX IF NOT EXISTS idx_gift_card_transactions_transaction_date ON gift_card_transactions(transaction_date);

-- Row Level Security for multitenancy
ALTER TABLE marketing_gift_cards ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Gift Cards are isolated by business" ON marketing_gift_cards;
CREATE POLICY "Gift Cards are isolated by business" ON marketing_gift_cards
    USING (auth.uid() IS NOT NULL AND business_id::text = current_setting('request.jwt.claims', true)::json->>'business_id')
    WITH CHECK (auth.uid() IS NOT NULL AND business_id::text = current_setting('request.jwt.claims', true)::json->>'business_id');

ALTER TABLE gift_card_instances ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Gift Card Instances are isolated by business" ON gift_card_instances;
CREATE POLICY "Gift Card Instances are isolated by business" ON gift_card_instances
    USING (auth.uid() IS NOT NULL AND business_id::text = current_setting('request.jwt.claims', true)::json->>'business_id')
    WITH CHECK (auth.uid() IS NOT NULL AND business_id::text = current_setting('request.jwt.claims', true)::json->>'business_id');

ALTER TABLE gift_card_transactions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Gift Card Transactions are isolated by business" ON gift_card_transactions;
CREATE POLICY "Gift Card Transactions are isolated by business" ON gift_card_transactions
    USING (auth.uid() IS NOT NULL AND business_id::text = current_setting('request.jwt.claims', true)::json->>'business_id')
    WITH CHECK (auth.uid() IS NOT NULL AND business_id::text = current_setting('request.jwt.claims', true)::json->>'business_id');

-- Function to generate unique gift card codes
CREATE OR REPLACE FUNCTION generate_gift_card_code()
RETURNS text AS $$
DECLARE
    code text;
    attempts integer := 0;
    max_attempts integer := 10;
BEGIN
    LOOP
        -- Generate 8-character alphanumeric code
        code := upper(substring(encode(gen_random_bytes(4), 'hex'), 1, 8));
        
        -- Check if code already exists
        IF NOT EXISTS (SELECT 1 FROM gift_card_instances WHERE unique_code = code) THEN
            RETURN code;
        END IF;
        
        attempts := attempts + 1;
        IF attempts >= max_attempts THEN
            RAISE EXCEPTION 'Failed to generate unique gift card code after % attempts', max_attempts;
        END IF;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Function to check gift card balance and validity
CREATE OR REPLACE FUNCTION validate_gift_card(card_code text, business_uuid uuid)
RETURNS TABLE(
    valid boolean,
    instance_id uuid,
    current_balance numeric,
    expires_at timestamptz,
    status text,
    error_message text
) AS $$
DECLARE
    card_instance gift_card_instances%ROWTYPE;
BEGIN
    -- Find the gift card instance
    SELECT * INTO card_instance 
    FROM gift_card_instances 
    WHERE unique_code = card_code 
    AND business_id = business_uuid;
    
    IF NOT FOUND THEN
        RETURN QUERY SELECT false, NULL::uuid, 0::numeric, NULL::timestamptz, 'not_found'::text, 'Gift card not found'::text;
        RETURN;
    END IF;
    
    -- Check if card is expired
    IF card_instance.expires_at IS NOT NULL AND card_instance.expires_at < now() THEN
        RETURN QUERY SELECT false, card_instance.id, card_instance.current_balance, card_instance.expires_at, 'expired'::text, 'Gift card has expired'::text;
        RETURN;
    END IF;
    
    -- Check card status
    IF card_instance.status != 'active' THEN
        RETURN QUERY SELECT false, card_instance.id, card_instance.current_balance, card_instance.expires_at, card_instance.status::text, 'Gift card is not active'::text;
        RETURN;
    END IF;
    
    -- Check if card has balance
    IF card_instance.current_balance <= 0 THEN
        RETURN QUERY SELECT false, card_instance.id, 0::numeric, card_instance.expires_at, 'no_balance'::text, 'Gift card has no remaining balance'::text;
        RETURN;
    END IF;
    
    -- Card is valid
    RETURN QUERY SELECT true, card_instance.id, card_instance.current_balance, card_instance.expires_at, 'active'::text, NULL::text;
    RETURN;
END;
$$ LANGUAGE plpgsql;

-- Function to redeem gift card
CREATE OR REPLACE FUNCTION redeem_gift_card(
    card_code text, 
    business_uuid uuid, 
    redemption_amount numeric, 
    booking_uuid uuid DEFAULT NULL,
    customer_uuid uuid DEFAULT NULL,
    transaction_description text DEFAULT NULL
)
RETURNS TABLE(
    success boolean,
    instance_id uuid,
    amount_redeemed numeric,
    remaining_balance numeric,
    transaction_id uuid,
    error_message text
) AS $$
DECLARE
    validation_result RECORD;
    card_instance gift_card_instances%ROWTYPE;
    new_transaction_id uuid;
    remaining_balance_after numeric;
BEGIN
    -- First validate the gift card
    SELECT * INTO validation_result FROM validate_gift_card(card_code, business_uuid);
    
    IF NOT validation_result.valid THEN
        RETURN QUERY SELECT false, NULL::uuid, 0::numeric, 0::numeric, NULL::uuid, validation_result.error_message;
        RETURN;
    END IF;
    
    -- Get current card instance
    SELECT * INTO card_instance 
    FROM gift_card_instances 
    WHERE id = validation_result.instance_id;
    
    -- Check if redemption amount is valid
    IF redemption_amount <= 0 THEN
        RETURN QUERY SELECT false, card_instance.id, 0::numeric, card_instance.current_balance, NULL::uuid, 'Redemption amount must be positive'::text;
        RETURN;
    END IF;
    
    IF redemption_amount > card_instance.current_balance THEN
        RETURN QUERY SELECT false, card_instance.id, 0::numeric, card_instance.current_balance, NULL::uuid, 'Insufficient gift card balance'::text;
        RETURN;
    END IF;
    
    -- Calculate remaining balance
    remaining_balance_after := card_instance.current_balance - redemption_amount;
    
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
        description
    ) VALUES (
        business_uuid,
        card_instance.id,
        'redemption',
        -redemption_amount, -- Negative for redemption
        card_instance.current_balance,
        remaining_balance_after,
        booking_uuid,
        customer_uuid,
        COALESCE(transaction_description, 'Gift card redemption')
    ) RETURNING id INTO new_transaction_id;
    
    -- Update gift card balance
    UPDATE gift_card_instances 
    SET current_balance = remaining_balance_after,
        updated_at = now(),
        status = CASE 
            WHEN remaining_balance_after <= 0 THEN 'fully_redeemed'
            ELSE 'active'
        END
    WHERE id = card_instance.id;
    
    -- Return success result
    RETURN QUERY SELECT true, card_instance.id, redemption_amount, remaining_balance_after, new_transaction_id, NULL::text;
    RETURN;
    
EXCEPTION
    WHEN OTHERS THEN
        RETURN QUERY SELECT false, NULL::uuid, 0::numeric, 0::numeric, NULL::uuid, 'Database error: ' || SQLERRM;
        RETURN;
END;
$$ LANGUAGE plpgsql;
