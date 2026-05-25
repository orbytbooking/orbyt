// Test Gift Card API Endpoints
// Run this in browser console or with curl

// Test 1: Create gift card template
const createTemplate = async () => {
  const response = await fetch('/api/marketing/gift-cards', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      business_id: 'YOUR_BUSINESS_ID',
      name: 'Test Gift Card',
      description: 'A test gift card',
      code: 'TEST',
      amount: 25.00,
      expires_in_months: 12,
      auto_generate_codes: true,
      active: true
    })
  });
  console.log('Create Template:', await response.json());
};

// Test 2: Purchase/send gift card instance
const purchaseGiftCard = async () => {
  const response = await fetch('/api/marketing/gift-cards/instances', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      business_id: 'YOUR_BUSINESS_ID',
      gift_card_id: 'TEMPLATE_ID_FROM_STEP_1',
      quantity: 1,
      purchaser_email: 'test@example.com',
      recipient_email: 'recipient@example.com',
      message: 'Test gift card'
    })
  });
  console.log('Purchase Gift Card:', await response.json());
};

// Test 3: Validate gift card
const validateGiftCard = async (code) => {
  const response = await fetch(`/api/marketing/gift-cards/redeem?business_id=YOUR_BUSINESS_ID&unique_code=${code}`);
  console.log('Validate Gift Card:', await response.json());
};

// Test 4: Redeem gift card
const redeemGiftCard = async (code, amount) => {
  const response = await fetch('/api/marketing/gift-cards/redeem', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      business_id: 'YOUR_BUSINESS_ID',
      unique_code: code,
      redemption_amount: amount,
      description: 'Test redemption'
    })
  });
  console.log('Redeem Gift Card:', await response.json());
};

// Run tests in order:
// 1. createTemplate()
// 2. purchaseGiftCard() 
// 3. validateGiftCard('CODE_FROM_STEP_2')
// 4. redeemGiftCard('CODE_FROM_STEP_2', 10.00)
