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

async function fixBookingDates() {
  console.log('📅 Fixing Booking Dates...\n');
  
  try {
    const businessId = '20ec44c8-1d49-45b9-ac7e-0412fd610ffb';
    
    // Update the first booking with today's date
    const today = new Date().toISOString().split('T')[0]; // Today's date in YYYY-MM-DD format
    
    console.log(`📝 Updating bookings with date: ${today}`);
    
    // Update first booking
    const { data: booking1, error: error1 } = await supabase
      .from('bookings')
      .update({ 
        scheduled_date: today,
        scheduled_time: '09:00:00'
      })
      .eq('business_id', businessId)
      .eq('customer_name', 'ABE JAY ofracio')
      .select();
    
    if (error1) {
      console.error('❌ Error updating booking 1:', error1);
    } else {
      console.log('✅ Updated booking 1:', booking1[0]);
    }
    
    // Update second booking with tomorrow's date
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];
    
    const { data: booking2, error: error2 } = await supabase
      .from('bookings')
      .update({ 
        scheduled_date: tomorrowStr,
        scheduled_time: '14:00:00'
      })
      .eq('business_id', businessId)
      .eq('customer_name', 'jane sample')
      .select();
    
    if (error2) {
      console.error('❌ Error updating booking 2:', error2);
    } else {
      console.log('✅ Updated booking 2:', booking2[0]);
    }
    
    console.log('\n🎉 Booking dates fixed! Now refresh your dashboard to see the data!');
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

fixBookingDates();
