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

async function debugDashboard() {
  console.log('🔍 Debugging Dashboard Data...\n');
  
  try {
    // 1. Check all businesses
    console.log('📊 All Businesses:');
    const { data: businesses, error: businessError } = await supabase
      .from('businesses')
      .select('*');
    
    if (businessError) {
      console.error('❌ Business error:', businessError);
    } else {
      console.log(`Found ${businesses?.length || 0} businesses:`);
      businesses?.forEach(b => {
        console.log(`  - ${b.name} (ID: ${b.id}, Owner: ${b.owner_id})`);
      });
    }
    
    console.log('\n📋 All Bookings:');
    const { data: bookings, error: bookingError } = await supabase
      .from('bookings')
      .select('*')
      .limit(5);
    
    if (bookingError) {
      console.error('❌ Booking error:', bookingError);
    } else {
      console.log(`Found ${bookings?.length || 0} bookings:`);
      bookings?.forEach(b => {
        console.log(`  - ${b.customer_name} - ${b.service} (Business: ${b.business_id})`);
      });
    }
    
  } catch (error) {
    console.error('❌ Debug error:', error);
  }
}

debugDashboard();
