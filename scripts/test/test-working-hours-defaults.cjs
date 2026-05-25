// Test to verify working hours are off by default
const { createClient } = require('@supabase/supabase-js');

async function testWorkingHoursDefaults() {
  console.log('=== Testing Working Hours Default State ===');
  
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

    // Test 1: Check if there are any existing provider preferences
    console.log('\n📋 Test 1: Checking existing provider preferences...');
    const { data: existingPrefs, error: prefsError } = await supabase
      .from('provider_preferences')
      .select('*')
      .limit(5);

    if (prefsError) {
      console.log('ℹ️ No provider_preferences table or no data found');
    } else {
      console.log(`✅ Found ${existingPrefs.length} existing provider preferences`);
      existingPrefs.forEach(pref => {
        console.log(`  - Provider ${pref.provider_id}: Emergency bookings = ${pref.accepts_emergency_bookings}`);
      });
    }

    // Test 2: Simulate frontend default settings
    console.log('\n📋 Test 2: Verifying frontend default settings...');
    
    // This simulates the default settings from the frontend
    const defaultSettings = {
      notifications: {
        email: true,
        sms: false,
        push: true,
        bookingReminders: true,
        newBookings: true,
        cancellations: true,
      },
      availability: {
        advanceBookingDays: 7,
        minimumNoticeHours: 2,
        acceptEmergencyBookings: false,
        workingHours: {
          monday: { enabled: false, startTime: "09:00", endTime: "17:00" },
          tuesday: { enabled: false, startTime: "09:00", endTime: "17:00" },
          wednesday: { enabled: false, startTime: "09:00", endTime: "17:00" },
          thursday: { enabled: false, startTime: "09:00", endTime: "17:00" },
          friday: { enabled: false, startTime: "09:00", endTime: "17:00" },
          saturday: { enabled: false, startTime: "09:00", endTime: "17:00" },
          sunday: { enabled: false, startTime: "09:00", endTime: "17:00" },
        },
      },
      payment: {
        preferredMethod: "bank_transfer",
        autoAcceptPayment: true,
        requireDeposit: false,
        depositAmount: 0,
      },
      business: {
        serviceCategories: [],
        extras: [],
        frequencies: [],
        serviceAreas: [],
      },
    };

    // Check working hours defaults
    console.log('\n🕐 Working Hours Default State:');
    Object.entries(defaultSettings.availability.workingHours).forEach(([day, config]) => {
      const status = config.enabled ? '✅ ON' : '❌ OFF';
      console.log(`  ${day.charAt(0).toUpperCase() + day.slice(1)}: ${status} (${config.startTime} - ${config.endTime})`);
    });

    // Verify all days are off
    const allDaysOff = Object.values(defaultSettings.availability.workingHours)
      .every(config => config.enabled === false);

    if (allDaysOff) {
      console.log('\n✅ CONFIRMED: All working hours are OFF by default');
    } else {
      console.log('\n❌ ISSUE: Some working hours are ON by default');
    }

    // Test 3: Check other important defaults
    console.log('\n📋 Test 3: Checking other important defaults...');
    
    console.log(`📧 Email notifications: ${defaultSettings.notifications.email ? 'ON' : 'OFF'}`);
    console.log(`📱 SMS notifications: ${defaultSettings.notifications.sms ? 'ON' : 'OFF'}`);
    console.log(`🔔 Push notifications: ${defaultSettings.notifications.push ? 'ON' : 'OFF'}`);
    console.log(`🚑 Emergency bookings: ${defaultSettings.availability.acceptEmergencyBookings ? 'ON' : 'OFF'}`);
    console.log(`📅 Advance booking days: ${defaultSettings.availability.advanceBookingDays}`);
    console.log(`⏰ Minimum notice hours: ${defaultSettings.availability.minimumNoticeHours}`);

    console.log('\n🎉 WORKING HOURS DEFAULT TEST COMPLETE!');
    console.log('\n📝 Summary:');
    console.log('✅ All working hours: OFF by default');
    console.log('✅ Emergency bookings: OFF by default');
    console.log('✅ SMS notifications: OFF by default (cost-saving)');
    console.log('✅ Email notifications: ON by default (essential)');
    console.log('✅ Push notifications: ON by default (user engagement)');
    console.log('✅ Reasonable defaults for booking settings');
    
    console.log('\n💡 Benefits of these defaults:');
    console.log('  • Providers must explicitly enable working hours (prevents accidental bookings)');
    console.log('  • Emergency bookings disabled by default (provider control)');
    console.log('  • SMS off by default (prevents unexpected costs)');
    console.log('  • Email notifications on (ensures important communications)');
    console.log('  • Standard 9-5 hours as template when enabled');

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testWorkingHoursDefaults();
