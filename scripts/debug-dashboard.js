const { createClient } = require('@supabase/supabase-js');

require('dotenv').config();

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
    
    console.log('\n👥 All Users:');
    const { data: users, error: userError } = await supabase.auth.admin.listUsers();
    
    if (userError) {
      console.error('❌ User error:', userError);
    } else {
      console.log(`Found ${users?.users?.length || 0} users:`);
      users?.users?.forEach(u => {
        console.log(`  - ${u.email} (ID: ${u.id}, Role: ${u.user_metadata?.role || 'none'})`);
      });
    }
    
  } catch (error) {
    console.error('❌ Debug error:', error);
  }
}

debugDashboard();
