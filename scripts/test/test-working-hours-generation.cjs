// Test the working hours generation feature
const { createClient } = require('@supabase/supabase-js');

async function testWorkingHoursGeneration() {
  console.log('=== Testing Working Hours Generation ===');
  
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

    console.log('✅ Provider found:', provider.id);

    // Test working hours configuration
    const testWorkingHours = {
      monday: { enabled: true, startTime: "09:00", endTime: "17:00" },
      tuesday: { enabled: false, startTime: "09:00", endTime: "17:00" },
      wednesday: { enabled: false, startTime: "09:00", endTime: "17:00" },
      thursday: { enabled: true, startTime: "09:00", endTime: "17:00" },
      friday: { enabled: false, startTime: "09:00", endTime: "17:00" },
      saturday: { enabled: false, startTime: "09:00", endTime: "17:00" },
      sunday: { enabled: false, startTime: "09:00", endTime: "17:00" },
    };

    console.log('📋 Test working hours:', testWorkingHours);

    // Generate slots for February 2026
    const startDate = '2026-02-01';
    const endDate = '2026-02-28';
    
    console.log(`📅 Generating slots for ${startDate} to ${endDate}`);

    // Clear existing slots first
    const { error: deleteError } = await supabase
      .from('provider_availability')
      .delete()
      .eq('provider_id', provider.id)
      .gte('effective_date', startDate)
      .lte('effective_date', endDate);

    if (deleteError) {
      console.error('❌ Error clearing existing slots:', deleteError);
    } else {
      console.log('✅ Cleared existing slots');
    }

    // Generate new slots
    const generatedSlots = [];
    const start = new Date(startDate);
    const end = new Date(endDate);

    // Map day names to day numbers (0 = Sunday, 1 = Monday, etc.)
    const dayMap = {
      sunday: 0,
      monday: 1,
      tuesday: 2,
      wednesday: 3,
      thursday: 4,
      friday: 5,
      saturday: 6
    };

    for (let date = new Date(start); date <= end; date.setDate(date.getDate() + 1)) {
      const dayOfWeek = date.getUTCDay(); // Use UTC for consistency
      const dayName = Object.keys(dayMap).find(key => dayMap[key] === dayOfWeek);
      
      if (dayName && testWorkingHours[dayName]?.enabled) {
        const hours = testWorkingHours[dayName];
        const dateStr = date.toISOString().split('T')[0];
        
        console.log(`📅 Generating slot for ${dateStr} (${dayName})`);
        
        // Create slot for this day
        const slot = {
          provider_id: provider.id,
          business_id: provider.business_id,
          day_of_week: dayOfWeek,
          start_time: hours.startTime + ':00',
          end_time: hours.endTime + ':00',
          is_available: true,
          effective_date: dateStr,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
        
        generatedSlots.push(slot);
      }
    }

    console.log(`📊 Generated ${generatedSlots.length} slots`);

    // Insert slots
    if (generatedSlots.length > 0) {
      const { data: insertedSlots, error: insertError } = await supabase
        .from('provider_availability')
        .insert(generatedSlots)
        .select();

      if (insertError) {
        console.error('❌ Error inserting slots:', insertError);
        return;
      }

      console.log(`✅ Successfully inserted ${insertedSlots.length} slots`);
      
      // Verify the slots
      console.log('\n🔍 Verifying generated slots:');
      insertedSlots.forEach((slot, index) => {
        const date = new Date(slot.effective_date);
        const dayName = date.toLocaleDateString('en-US', { weekday: 'long' });
        console.log(`  ${index + 1}. ${slot.effective_date} (${dayName}) - ${slot.start_time} to ${slot.end_time} (day_of_week: ${slot.day_of_week})`);
      });

      // Check specific Thursdays in February 2026
      console.log('\n🎯 Checking Thursdays in February 2026:');
      const thursdaySlots = insertedSlots.filter(slot => slot.day_of_week === 4);
      console.log(`  - Found ${thursdaySlots.length} Thursday slots:`);
      thursdaySlots.forEach((slot, index) => {
        console.log(`    ${index + 1}. ${slot.effective_date} - ${slot.start_time} to ${slot.end_time}`);
      });

      console.log('\n🎉 Working hours generation test complete!');
      console.log('\n💡 What this means:');
      console.log('  - Monday and Thursday are enabled in working hours');
      console.log('  - All Mondays and Thursdays in February 2026 now have slots');
      console.log('  - Each slot is 9:00 AM to 5:00 PM');
      console.log('  - The calendar should show slots on the correct days');

    } else {
      console.log('ℹ️ No slots generated (no working hours enabled)');
    }

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testWorkingHoursGeneration();
