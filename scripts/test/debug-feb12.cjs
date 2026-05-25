// Test to debug the February 12 date issue
const { createClient } = require('@supabase/supabase-js');

async function debugFeb12Issue() {
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

    // Test 1: Check provider authentication
    console.log('\n📋 Test 1: Finding provider...');
    const { data: providers, error: providersError } = await supabase
      .from('service_providers')
      .select('id, user_id, first_name, last_name, business_id')
      .not('user_id', 'is', null)
      .limit(1);

    if (providersError || providers.length === 0) {
      console.error('❌ No provider found:', providersError);
      return;
    }

    const provider = providers[0];
    console.log(`✅ Using provider: ${provider.first_name} ${provider.last_name}`);

    // Test 2: Test February 12 date specifically
    console.log('\n📋 Test 2: Testing February 12 date...');
    const testDate = '2026-02-12';
    console.log(`📅 Testing date: ${testDate}`);
    
    const bookingDate = new Date(testDate);
    const dayOfWeek = bookingDate.getDay();
    const dayName = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][dayOfWeek];
    
    console.log(`📊 Date analysis:`);
    console.log(`  - Date object: ${bookingDate.toString()}`);
    console.log(`  - Day of week: ${dayOfWeek} (${dayName})`);
    console.log(`  - Valid date: ${!isNaN(bookingDate.getTime())}`);

    // Test 3: Check if there are existing slots for this date
    console.log('\n📋 Test 3: Checking existing slots for Feb 12...');
    const { data: existingSlots, error: existingError } = await supabase
      .from('provider_availability')
      .select('*')
      .eq('provider_id', provider.id)
      .eq('day_of_week', dayOfWeek)
      .eq('effective_date', testDate);

    if (existingError) {
      console.error('❌ Error checking existing slots:', existingError);
    } else {
      console.log(`✅ Found ${existingSlots.length} existing slots for Feb 12 (${dayName})`);
      existingSlots.forEach(slot => {
        console.log(`  - ${slot.start_time} - ${slot.end_time} (ID: ${slot.id})`);
      });
    }

    // Test 4: Try to add a slot for Feb 12
    console.log('\n📋 Test 4: Attempting to add slot for Feb 12...');
    const testSlot = {
      provider_id: provider.id,
      business_id: provider.business_id,
      day_of_week: dayOfWeek,
      start_time: '14:00:00',
      end_time: '16:00:00',
      is_available: true,
      effective_date: testDate,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    console.log('📝 Slot data to insert:', testSlot);

    const { data: newSlot, error: insertError } = await supabase
      .from('provider_availability')
      .insert(testSlot)
      .select()
      .single();

    if (insertError) {
      console.error('❌ Error inserting slot:', insertError);
      console.error('Error details:', {
        message: insertError.message,
        details: insertError.details,
        hint: insertError.hint,
        code: insertError.code
      });
      
      // Check for specific constraint violations
      if (insertError.code === '23505') {
        console.log('🚨 This is a unique constraint violation!');
        console.log('💡 There might be a unique constraint on (provider_id, day_of_week, start_time, end_time)');
      }
    } else {
      console.log('✅ Slot added successfully:');
      console.log(`  - ID: ${newSlot.id}`);
      console.log(`  - Day ${newSlot.day_of_week}: ${newSlot.start_time} - ${newSlot.end_time}`);

      // Clean up
      await supabase
        .from('provider_availability')
        .delete()
        .eq('id', newSlot.id);
      console.log('🧹 Test slot cleaned up');
    }

    // Test 5: Check database constraints
    console.log('\n📋 Test 5: Checking table constraints...');
    const { data: constraints, error: constraintsError } = await supabase
      .from('provider_availability')
      .select('*')
      .limit(0);

    if (constraintsError) {
      console.log('ℹ️ Table access check completed');
    }

    // Test 6: Test other dates for comparison
    console.log('\n📋 Test 6: Testing other dates for comparison...');
    const otherDates = ['2026-02-11', '2026-02-13', '2026-02-14'];
    
    for (const date of otherDates) {
      const dateObj = new Date(date);
      const day = dateObj.getDay();
      const dayName = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][day];
      
      console.log(`  - ${date}: Day ${day} (${dayName})`);
      
      const { data: slots, error: slotsError } = await supabase
        .from('provider_availability')
        .select('*')
        .eq('provider_id', provider.id)
        .eq('day_of_week', day)
        .eq('effective_date', date);
      
      if (!slotsError) {
        console.log(`    Found ${slots.length} existing slots`);
      }
    }

    console.log('\n🎉 Debug test complete!');
    console.log('\n💡 Possible causes for the error:');
    console.log('  1. Unique constraint violation (duplicate slot)');
    console.log('  2. Date format issue');
    console.log('  3. Day of week calculation error');
    console.log('  4. Database constraint violation');
    console.log('  5. Authentication/authorization issue');

  } catch (error) {
    console.error('❌ Debug test failed:', error);
  }
}

debugFeb12Issue();
