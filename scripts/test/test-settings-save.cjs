// Test to verify settings save works
const { createClient } = require('@supabase/supabase-js');

async function testSettingsSave() {
  console.log('=== Testing Settings Save ===');
  
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
      .select('id, user_id')
      .not('user_id', 'is', null)
      .limit(1)
      .single();

    if (providerError || !provider) {
      console.error('❌ No provider found');
      return;
    }

    console.log('✅ Provider found:', provider.id);

    // Test settings object (simulating frontend)
    const testSettings = {
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
        timezone: 'Asia/Manila',
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

    console.log('📋 Test settings created');

    // Simulate API call
    const { data: updatedPreferences, error: updateError } = await supabase
      .from('provider_preferences')
      .upsert({
        provider_id: provider.id,
        auto_assignments: testSettings.availability?.acceptEmergencyBookings || false,
        email_notifications: testSettings.notifications?.email || true,
        sms_notifications: testSettings.notifications?.sms || false,
        advance_booking_days: testSettings.availability?.advanceBookingDays || 7,
        minimum_booking_notice_hours: testSettings.availability?.minimumNoticeHours || 2,
        accepts_emergency_bookings: testSettings.availability?.acceptEmergencyBookings || false,
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (updateError) {
      console.error('❌ Settings save failed:', updateError);
      return;
    }

    console.log('✅ Settings saved successfully!');
    console.log('📊 Updated preferences:', updatedPreferences);

    // Verify the save by reading back
    const { data: savedPreferences, error: fetchError } = await supabase
      .from('provider_preferences')
      .select('*')
      .eq('provider_id', provider.id)
      .order('updated_at', { ascending: false })
      .limit(1)
      .single();

    if (fetchError) {
      console.error('❌ Verification failed:', fetchError);
      return;
    }

    console.log('✅ Verification successful!');
    console.log('📊 Saved preferences:', savedPreferences);

    // Check that the values match
    const matches = {
      email_notifications: savedPreferences.email_notifications === testSettings.notifications.email,
      sms_notifications: savedPreferences.sms_notifications === testSettings.notifications.sms,
      advance_booking_days: savedPreferences.advance_booking_days === testSettings.availability.advanceBookingDays,
      minimum_booking_notice_hours: savedPreferences.minimum_booking_notice_hours === testSettings.availability.minimumNoticeHours,
      accepts_emergency_bookings: savedPreferences.accepts_emergency_bookings === testSettings.availability.acceptEmergencyBookings,
    };

    console.log('🔍 Value matches:', matches);

    const allMatch = Object.values(matches).every(Boolean);
    if (allMatch) {
      console.log('✅ All values saved correctly!');
    } else {
      console.log('❌ Some values don\'t match');
    }

    console.log('\n🎉 Settings save test complete!');
    console.log('\n💡 The provider settings should now work in the UI');

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testSettingsSave();
