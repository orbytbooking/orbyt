// Debug February 12 date issue
const { createClient } = require('@supabase/supabase-js');

async function debugFeb12() {
  console.log('=== Debugging February 12 Issue ===');
  
  try {
    const supabase = createClient(
      'https://gpalzskadkrfedlwqobq.supabase.co',
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdwYWx6c2thZGtyZmVkbHdxb2JxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODk5Njg3NywiZXhwIjoyMDg0NTcyODc3fQ.DEBEmRaiuYAmqzuve-4WO7j_OI388BM_wMsCwT9OBmE',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    // Test February 12, 2026
    const testDate = '2026-02-12';
    console.log('📅 Testing date:', testDate);
    
    // Test different date calculations
    console.log('\n🔍 Date Calculations:');
    
    // 1. Local time (original method)
    const localDate = new Date(testDate);
    console.log(`  - Local Date: ${localDate.toString()}`);
    console.log(`  - getDay(): ${localDate.getDay()} (0=Sun, 1=Mon, 2=Tue, 3=Wed, 4=Thu, 5=Fri, 6=Sat)`);
    
    // 2. UTC method (current fix)
    const utcDate = new Date(testDate + 'T00:00:00Z');
    console.log(`  - UTC Date: ${utcDate.toString()}`);
    console.log(`  - getUTCDay(): ${utcDate.getUTCDay()} (0=Sun, 1=Mon, 2=Tue, 3=Wed, 4=Thu, 5=Fri, 6=Sat)`);
    
    // 3. Check what day Feb 12, 2026 actually is
    console.log('\n📅 Calendar Check:');
    console.log('  - February 12, 2026 should be a Wednesday');
    console.log('  - Let\'s verify by checking adjacent dates...');
    
    const feb11 = new Date('2026-02-11T00:00:00Z');
    const feb12 = new Date('2026-02-12T00:00:00Z');
    const feb13 = new Date('2026-02-13T00:00:00Z');
    
    console.log(`  - Feb 11 UTC: ${feb11.toUTCString()} - Day ${feb11.getUTCDay()} (${['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][feb11.getUTCDay()]})`);
    console.log(`  - Feb 12 UTC: ${feb12.toUTCString()} - Day ${feb12.getUTCDay()} (${['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][feb12.getUTCDay()]})`);
    console.log(`  - Feb 13 UTC: ${feb13.toUTCString()} - Day ${feb13.getUTCDay()} (${['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][feb13.getUTCDay()]})`);

    // Check existing slots
    console.log('\n📊 Checking Existing Slots:');
    const { data: slots, error: slotsError } = await supabase
      .from('provider_availability')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10);

    if (slotsError) {
      console.error('❌ Error fetching slots:', slotsError);
    } else {
      console.log(`  - Found ${slots.length} recent slots:`);
      slots.forEach((slot, index) => {
        console.log(`    ${index + 1}. Date: ${slot.effective_date}, Day: ${slot.day_of_week} (${['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][slot.day_of_week]}), Time: ${slot.start_time}-${slot.end_time}`);
      });
    }

    // Test adding a slot for Feb 12
    console.log('\n🧪 Test Adding Slot for Feb 12:');
    
    // Get a provider
    const { data: provider, error: providerError } = await supabase
      .from('service_providers')
      .select('id, business_id')
      .not('user_id', 'is', null)
      .limit(1)
      .single();

    if (providerError || !provider) {
      console.error('❌ No provider found');
      return;
    }

    // Calculate day_of_week using current API method
    const bookingDate = new Date(testDate + 'T00:00:00Z');
    const dayOfWeek = bookingDate.getUTCDay();
    
    console.log(`  - API would calculate day_of_week as: ${dayOfWeek} (${['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][dayOfWeek]})`);
    
    // Check if slot already exists
    const { data: existingSlot, error: existingError } = await supabase
      .from('provider_availability')
      .select('*')
      .eq('provider_id', provider.id)
      .eq('effective_date', testDate)
      .eq('start_time', '09:00:00')
      .single();

    if (existingSlot && !existingError) {
      console.log(`  - Slot already exists with day_of_week: ${existingSlot.day_of_week} (${['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][existingSlot.day_of_week]})`);
    } else if (existingError && existingError.code !== 'PGRST116') {
      console.log(`  - No existing slot found`);
    }

    console.log('\n🎯 Expected Result:');
    console.log('  - Feb 12, 2026 = Wednesday');
    console.log('  - Should show in Wednesday column');
    console.log('  - Day of week should be 3 (0=Sunday, 3=Wednesday)');

    console.log('\n💡 If slot appears in Thursday:');
    console.log('  - Day of week is being calculated as 4 (Thursday)');
    console.log('  - This means UTC calculation is off by 1 day');
    console.log('  - Might need to adjust timezone handling');

  } catch (error) {
    console.error('❌ Debug failed:', error);
  }
}

debugFeb12();
