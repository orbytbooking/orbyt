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

async function queryBusiness() {
  console.log('🏢 Querying Business Data Directly...\n');
  
  try {
    // Your business ID from the logs
    const businessId = '20ec44c8-1d49-45b9-ac7e-0412fd610ffb';
    
    console.log(`🔍 Querying business with ID: ${businessId}`);
    
    // Query the business directly
    const { data: business, error: businessError } = await supabase
      .from('businesses')
      .select('*')
      .eq('id', businessId)
      .single();
    
    if (businessError) {
      console.error('❌ Business query error:', businessError);
      return;
    }
    
    console.log('✅ Business found:');
    console.log(`  Name: ${business.name}`);
    console.log(`  ID: ${business.id}`);
    console.log(`  Owner: ${business.owner_id}`);
    console.log(`  Plan: ${business.plan}`);
    console.log(`  Active: ${business.is_active}`);
    console.log(`  Created: ${business.created_at}`);
    
    // Now query bookings for this business
    console.log('\n📋 Querying bookings for this business:');
    const { data: bookings, error: bookingError } = await supabase
      .from('bookings')
      .select('*')
      .eq('business_id', businessId);
    
    if (bookingError) {
      console.error('❌ Booking query error:', bookingError);
      return;
    }
    
    console.log(`✅ Found ${bookings?.length || 0} bookings:`);
    bookings?.forEach((booking, index) => {
      console.log(`  ${index + 1}. ${booking.customer_name} - ${booking.service}`);
      console.log(`     Status: ${booking.status}`);
      console.log(`     Date: ${booking.scheduled_date}`);
      console.log(`     Price: $${booking.total_price || 0}`);
      console.log('');
    });
    
    // Query customers for this business
    console.log('👥 Querying customers for this business:');
    const { data: customers, error: customerError } = await supabase
      .from('customers')
      .select('*')
      .eq('business_id', businessId);
    
    if (customerError) {
      console.error('❌ Customer query error:', customerError);
      return;
    }
    
    console.log(`✅ Found ${customers?.length || 0} customers:`);
    customers?.forEach((customer, index) => {
      console.log(`  ${index + 1}. ${customer.name} - ${customer.email}`);
      console.log(`     Phone: ${customer.phone || 'N/A'}`);
      console.log(`     Status: ${customer.status}`);
      console.log('');
    });
    
  } catch (error) {
    console.error('❌ Query error:', error);
  }
}

queryBusiness();
