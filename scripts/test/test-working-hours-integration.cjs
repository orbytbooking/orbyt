const { createClient } = require('@supabase/supabase-js');

// Load environment variables manually
const fs = require('fs');
const path = require('path');

function loadEnvFile() {
  try {
    const envFile = fs.readFileSync(path.join(__dirname, '../../../.env'), 'utf8');
    const envVars = {};
    envFile.split('\n').forEach(line => {
      const match = line.match(/^([^=]+)=(.*)$/);
      if (match) {
        envVars[match[1]] = match[2];
      }
    });
    return envVars;
  } catch (error) {
    console.error('Could not load .env file');
    return {};
  }
}

const env = loadEnvFile();

const supabaseAdmin = createClient(
  env.NEXT_PUBLIC_SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

async function testWorkingHoursIntegration() {
  console.log('=== TESTING WORKING HOURS INTEGRATION ===');
  
  try {
    // Get a test provider
    const { data: provider, error: providerError } = await supabaseAdmin
      .from('service_providers')
      .select('*')
      .limit(1)
      .single();
    
    if (providerError || !provider) {
      console.error('❌ No test provider found');
      return;
    }
    
    console.log('✅ Found test provider:', provider.email);
    
    // Test working hours data
    const testWorkingHours = {
      monday: { enabled: true, startTime: "09:00", endTime: "17:00" },
      tuesday: { enabled: true, startTime: "09:00", endTime: "17:00" },
      wednesday: { enabled: false, startTime: "09:00", endTime: "17:00" },
      thursday: { enabled: true, startTime: "09:00", endTime: "17:00" },
      friday: { enabled: true, startTime: "09:00", endTime: "17:00" },
      saturday: { enabled: false, startTime: "09:00", endTime: "17:00" },
      sunday: { enabled: false, startTime: "09:00", endTime: "17:00" }
    };
    
    console.log('🔍 Test working hours:', testWorkingHours);
    
    // Clear existing slots for this provider
    console.log('🗑️ Clearing existing slots...');
    await supabaseAdmin
      .from('provider_availability')
      .delete()
      .eq('provider_id', provider.id);
    
    // Simulate the API call
    const dayMapping = {
      'monday': 1,
      'tuesday': 2,
      'wednesday': 3,
      'thursday': 4,
      'friday': 5,
      'saturday': 6,
      'sunday': 0
    };
    
    const results = [];
    
    for (const [dayName, dayConfig] of Object.entries(testWorkingHours)) {
      const dayOfWeek = dayMapping[dayName];
      
      if (dayConfig.enabled) {
        const { data: newSlot, error: insertError } = await supabaseAdmin
          .from('provider_availability')
          .insert({
            provider_id: provider.id,
            business_id: provider.business_id,
            day_of_week: dayOfWeek,
            start_time: dayConfig.startTime + ':00',
            end_time: dayConfig.endTime + ':00',
            is_available: true,
            effective_date: null, // Recurring slot
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .select()
          .single();
        
        if (insertError) {
          console.error(`❌ Error creating slot for ${dayName}:`, insertError);
        } else {
          console.log(`✅ Created slot for ${dayName}:`, newSlot);
          results.push({ day: dayName, slot: newSlot });
        }
      }
    }
    
    // Verify the slots were created
    console.log('\n📊 Verifying created slots...');
    const { data: createdSlots, error: fetchError } = await supabaseAdmin
      .from('provider_availability')
      .select('*')
      .eq('provider_id', provider.id)
      .order('day_of_week');
    
    if (fetchError) {
      console.error('❌ Error fetching slots:', fetchError);
    } else {
      console.log('✅ Found created slots:');
      createdSlots.forEach(slot => {
        const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        console.log(`  - ${dayNames[slot.day_of_week]}: ${slot.start_time} - ${slot.end_time} (Recurring: ${slot.effective_date === null})`);
      });
    }
    
    // Test calendar filtering logic
    console.log('\n📅 Testing calendar filtering...');
    
    // Test dates for February 2026
    const testDates = [
      new Date('2026-02-03'), // Monday
      new Date('2026-02-04'), // Tuesday  
      new Date('2026-02-05'), // Wednesday (should be empty)
      new Date('2026-02-06'), // Thursday
      new Date('2026-02-07'), // Friday
    ];
    
    testDates.forEach(date => {
      const dayOfWeek = date.getUTCDay();
      const dayName = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][dayOfWeek];
      
      const matchingSlots = createdSlots.filter(slot => {
        if (slot.day_of_week !== dayOfWeek) return false;
        if (!slot.effective_date) return true; // Recurring slots match all dates
        return false;
      });
      
      console.log(`  - ${date.toDateString()} (${dayName}): ${matchingSlots.length} slots`);
      matchingSlots.forEach(slot => {
        console.log(`    * ${slot.start_time} - ${slot.end_time}`);
      });
    });
    
    console.log('\n🎉 Integration test complete!');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testWorkingHoursIntegration();
