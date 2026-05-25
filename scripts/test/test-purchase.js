const testPurchase = async () => {
  try {
    // First, get real gift card templates
    console.log('🔍 Getting available gift cards...');
    const templatesResponse = await fetch('http://localhost:3000/api/marketing/gift-cards?business_id=00000000-0000-0000-0000-00000000000000001&active=true');
    const templatesResult = await templatesResponse.json();
    
    console.log('Available templates:', templatesResult);
    
    if (!templatesResponse.ok || !templatesResult.data || templatesResult.data.length === 0) {
      console.log('❌ No active gift card templates found');
      return;
    }
    
    const firstTemplate = templatesResult.data[0];
    console.log('🎁 Using template:', firstTemplate.name, 'ID:', firstTemplate.id);
    
    // Now try to purchase with real UUID
    console.log('🛒 Attempting purchase...');
    const response = await fetch('http://localhost:3000/api/marketing/gift-cards/instances', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        business_id: '00000000-0000-0000-0000-00000000000000001',
        gift_card_id: firstTemplate.id,
        quantity: 1,
        purchaser_email: 'test@example.com',
        recipient_email: 'recipient@example.com',
        message: 'Test gift card purchase'
      })
    });

    const result = await response.json();
    console.log('Purchase result:', result);
    
    if (response.ok) {
      console.log('✅ Purchase successful!');
      console.log('🎉 Created gift card instances:', result.data);
    } else {
      console.log('❌ Purchase failed:', result.error);
    }
  } catch (error) {
    console.error('❌ Error:', error);
  }
};

testPurchase();
