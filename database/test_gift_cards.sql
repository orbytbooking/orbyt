-- Test Gift Card Functionality
-- This script tests the complete gift card workflow

-- First, let's check if the tables exist
SELECT table_name, table_schema 
FROM information_schema.tables 
WHERE table_name LIKE '%gift%' 
ORDER BY table_name;

-- Check if the functions exist
SELECT routine_name, routine_type 
FROM information_schema.routines 
WHERE routine_name LIKE '%gift%' 
ORDER BY routine_name;

-- Test creating a sample gift card template (if businesses exist)
DO $$
DECLARE
    business_id_val UUID;
BEGIN
    -- Get the first business ID
    SELECT id INTO business_id_val FROM businesses LIMIT 1;
    
    IF business_id_val IS NOT NULL THEN
        -- Insert a sample gift card template
        INSERT INTO marketing_gift_cards (
            business_id, 
            name, 
            description, 
            code, 
            amount, 
            active, 
            expires_in_months, 
            auto_generate_codes
        ) VALUES (
            business_id_val,
            'Test Gift Card',
            'A test gift card for validation',
            'TEST',
            25.00,
            true,
            12,
            true
        ) ON CONFLICT DO NOTHING;
        
        RAISE NOTICE 'Test gift card template created for business: %', business_id_val;
    ELSE
        RAISE NOTICE 'No businesses found. Please create a business first.';
    END IF;
END $$;

-- Test creating a gift card instance
DO $$
DECLARE
    business_id_val UUID;
    gift_card_id_val UUID;
BEGIN
    -- Get the first business and gift card
    SELECT id INTO business_id_val FROM businesses LIMIT 1;
    SELECT id INTO gift_card_id_val FROM marketing_gift_cards WHERE business_id = business_id_val LIMIT 1;
    
    IF business_id_val IS NOT NULL AND gift_card_id_val IS NOT NULL THEN
        -- Insert a sample gift card instance
        INSERT INTO gift_card_instances (
            business_id, 
            gift_card_id, 
            unique_code, 
            original_amount, 
            current_balance, 
            purchase_date, 
            expires_at, 
            status
        ) VALUES (
            business_id_val,
            gift_card_id_val,
            'TEST12345',
            25.00,
            25.00,
            NOW(),
            NOW() + INTERVAL '12 months',
            'active'
        ) ON CONFLICT (unique_code) DO NOTHING;
        
        RAISE NOTICE 'Test gift card instance created with code: TEST12345';
    ELSE
        RAISE NOTICE 'Could not create test instance - missing business or gift card';
    END IF;
END $$;

-- Test the validate function
SELECT * FROM validate_gift_card('TEST12345', (SELECT id FROM businesses LIMIT 1));

-- Test the redeem function (partial redemption)
SELECT * FROM redeem_gift_card(
    'TEST12345', 
    (SELECT id FROM businesses LIMIT 1),
    10.00,
    NULL,
    NULL,
    'Test redemption'
);

-- Check balance after partial redemption
SELECT * FROM validate_gift_card('TEST12345', (SELECT id FROM businesses LIMIT 1));

-- Test full redemption
SELECT * FROM redeem_gift_card(
    'TEST12345', 
    (SELECT id FROM businesses LIMIT 1),
    15.00,
    NULL,
    NULL,
    'Final redemption'
);

-- Check final status
SELECT * FROM validate_gift_card('TEST12345', (SELECT id FROM businesses LIMIT 1));

-- Show all gift card transactions
SELECT 
    gct.*,
    gci.unique_code,
    mgc.name as gift_card_name
FROM gift_card_transactions gct
JOIN gift_card_instances gci ON gct.gift_card_instance_id = gci.id
JOIN marketing_gift_cards mgc ON gci.gift_card_id = mgc.id
ORDER BY gct.transaction_date DESC;

-- Show all gift card instances
SELECT 
    gci.*,
    mgc.name as gift_card_name,
    mgc.amount as template_amount
FROM gift_card_instances gci
JOIN marketing_gift_cards mgc ON gci.gift_card_id = mgc.id
ORDER BY gci.created_at DESC;
