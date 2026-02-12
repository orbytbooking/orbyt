// Test to debug the day of week calculation issue
const { createClient } = require('@supabase/supabase-js');

async function debugDayOfWeekIssue() {
  console.log('=== Debugging Day of Week Calculation Issue ===');
  
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

    // Test 1: Check day of week calculation for Thursday Feb 12, 2026
    console.log('\n📋 Test 1: Testing Thursday Feb 12, 2026...');
    const testDate = '2026-02-12';
    const bookingDate = new Date(testDate);
    const calculatedDayOfWeek = bookingDate.getDay();
    
    console.log(`📅 Date: ${testDate}`);
    console.log(`📊 Date object: ${bookingDate.toString()}`);
    console.log(`🔢 getDay() result: ${calculatedDayOfWeek}`);
    console.log(`📖 Expected: Thursday (4)`);
    console.log(`✅ Correct: ${calculatedDayOfWeek === 4}`);

    // Test 2: Test multiple dates
    console.log('\n📋 Test 2: Testing multiple dates...');
    const testDates = [
      '2026-02-09', // Sunday
      '2026-02-10', // Monday  
      '2026-02-11', // Tuesday
      '2026-02-12', // Wednesday (should be Thursday)
      '2026-02-13', // Thursday (should be Friday)
      '2026-02-14', // Friday (should be Saturday)
      '2026-02-15', // Saturday (should be Sunday)
    ];

    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    
    testDates.forEach(date => {
      const dateObj = new Date(date);
      const dayOfWeek = dateObj.getDay();
      const dayName = dayNames[dayOfWeek];
      const dayNameFromDate = dateObj.toLocaleDateString('en-US', { weekday: 'long' });
      
      console.log(`  ${date}: getDay()=${dayOfWeek} (${dayName}) - Date says: ${dayNameFromDate}`);
      
      if (dayName !== dayNameFromDate) {
        console.log(`    ❌ MISMATCH! getDay() says ${dayName} but Date says ${dayNameFromDate}`);
      }
    });

    // Test 3: Check timezone issues
    console.log('\n📋 Test 3: Checking timezone issues...');
    const utcDate = new Date('2026-02-12T00:00:00Z');
    const localDate = new Date('2026-02-12');
    
    console.log(`UTC Date: ${utcDate.toString()}`);
    console.log(`UTC getDay(): ${utcDate.getDay()}`);
    console.log(`Local Date: ${localDate.toString()}`);
    console.log(`Local getDay(): ${localDate.getDay()}`);
    
    // Test 4: Check what's actually in the database
    console.log('\n📋 Test 4: Checking database for Thursday slots...');
    const { data: provider } = await supabase
      .from('service_providers')
      .select('id')
      .not('user_id', 'is', null)
      .limit(1)
      .single();

    if (provider) {
      const { data: slots, error } = await supabase
        .from('provider_availability')
        .select('*')
        .eq('provider_id', provider.id)
        .order('created_at', { ascending: false })
        .limit(5);

      if (!error && slots.length > 0) {
        console.log('Recent slots in database:');
        slots.forEach(slot => {
          const slotDate = new Date(slot.effective_date);
          const dbDayOfWeek = slot.day_of_week;
          const calculatedDayOfWeek = slotDate.getDay();
          const dayName = dayNames[dbDayOfWeek];
          const expectedDayName = dayNames[calculatedDayOfWeek];
          
          console.log(`  - Date: ${slot.effective_date}`);
          console.log(`    Stored day_of_week: ${dbDayOfWeek} (${dayName})`);
          console.log(`    Calculated getDay(): ${calculatedDayOfWeek} (${expectedDayName})`);
          console.log(`    Match: ${dbDayOfWeek === calculatedDayOfWeek ? '✅' : '❌'}`);
          console.log(`    Time: ${slot.start_time} - ${slot.end_time}`);
          console.log('');
        });
      }
    }

    // Test 5: Simulate the exact API process
    console.log('\n📋 Test 5: Simulating API process...');
    const apiDate = '2026-02-12'; // Thursday
    const apiBookingDate = new Date(apiDate);
    const apiDayOfWeek = apiBookingDate.getDay();
    
    console.log(`API receives date: ${apiDate}`);
    console.log(`API creates Date object: ${apiBookingDate.toString()}`);
    console.log(`API calculates day_of_week: ${apiDayOfWeek}`);
    console.log(`API stores: day_of_week = ${apiDayOfWeek}`);
    
    // Now simulate frontend display
    const frontendDate = new Date(apiDate);
    const frontendDayOfWeek = frontendDate.getDay();
    console.log(`Frontend Date object: ${frontendDate.toString()}`);
    console.log(`Frontend calculates day_of_week: ${frontendDayOfWeek}`);
    console.log(`Frontend looks for slots with day_of_week: ${frontendDayOfWeek}`);
    
    console.log('\n🎉 Debug analysis complete!');
    console.log('\n💡 Possible issues:');
    console.log('1. Timezone differences between API and frontend');
    console.log('2. Date object creation differences');
    console.log('3. Daylight saving time effects');
    console.log('4. Server vs client timezone mismatch');

  } catch (error) {
    console.error('❌ Debug test failed:', error);
  }
}

debugDayOfWeekIssue();
