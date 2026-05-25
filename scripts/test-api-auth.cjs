const { createClient } = require('@supabase/supabase-js');

// Read environment variables from .env file
const fs = require('fs');
const path = require('path');

// Load environment variables
const envPath = path.join(__dirname, '.env');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach(line => {
    const [key, ...values] = line.split('=');
    if (key && values.length > 0) {
      process.env[key.trim()] = values.join('=').trim();
    }
  });
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function testAPIAuth() {
  console.log('🧪 Testing API Authentication...\n');
  
  try {
    // Your user ID
    const yourUserId = '76f6a2f5-5feb-4b1a-801c-d27f7212c611';
    const businessId = '20ec44c8-1d49-45b9-ac7e-0412fd610ffb';
    
    console.log(`👤 Testing access for user: ${yourUserId}`);
    console.log(`🏢 Testing business: ${businessId}`);
    
    // Test the exact query the API is making
    const { data: businessAccess, error: accessError } = await supabase
      .from('businesses')
      .select('id')
      .or(`owner_id.eq.${yourUserId},id.in.(SELECT business_id FROM profiles WHERE id = ${yourUserId} AND business_id IS NOT NULL AND is_active = true)`)
      .eq('id', businessId)
      .single();
    
    if (accessError) {
      console.error('❌ Access test failed:', accessError);
      console.log('This is the same query the API is making');
    } else {
      console.log('✅ Access test passed!');
      console.log('Business access:', businessAccess);
    }
    
    // Test simplified query (just owner)
    console.log('\n🔍 Testing simplified query (owner only):');
    const { data: ownerAccess, error: ownerError } = await supabase
      .from('businesses')
      .select('id')
      .eq('owner_id', yourUserId)
      .eq('id', businessId)
      .single();
    
    if (ownerError) {
      console.error('❌ Owner access failed:', ownerError);
    } else {
      console.log('✅ Owner access passed!');
      console.log('Owner access:', ownerAccess);
    }
    
  } catch (error) {
    console.error('❌ Test error:', error);
  }
}

testAPIAuth();
