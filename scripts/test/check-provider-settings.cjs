// Check provider settings for working hours
const { createClient } = require('@supabase/supabase-js');

async function checkProviderSettings() {
  console.log('=== Checking Provider Settings ===');
  
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

    // Get provider
    const { data: provider, error: providerError } = await supabase
      .from('service_providers')
      .select('id, user_id, business_id')
      .not('user_id', 'is', null)
      .limit(1)
      .single();

    if (providerError || !provider) {
      console.error('❌ No provider found:', providerError);
      return;
    }

    console.log('✅ Provider found:', provider.id);

    // Check provider preferences
    const { data: preferences, error: prefError } = await supabase
      .from('provider_preferences')
      .select('*')
      .eq('provider_id', provider.id)
      .order('updated_at', { ascending: false })
      .limit(1);

    if (prefError) {
      console.error('❌ Error fetching preferences:', prefError);
      return;
    }

    console.log('📋 Provider preferences:', preferences);

    if (preferences && preferences.length > 0) {
      const pref = preferences[0];
      console.log('📝 Latest preference:');
      console.log('  - Auto assignments:', pref.auto_assignments);
      console.log('  - Email notifications:', pref.email_notifications);
      console.log('  - SMS notifications:', pref.sms_notifications);
      console.log('  - Advance booking days:', pref.advance_booking_days);
      console.log('  - Minimum notice hours:', pref.minimum_booking_notice_hours);
      console.log('  - Accepts emergency bookings:', pref.accepts_emergency_bookings);
      console.log('  - Updated at:', pref.updated_at);
      
      // Check if there's any working hours data
      if (pref.working_hours) {
        console.log('⏰ Working hours found:', pref.working_hours);
      } else {
        console.log('⚠️ No working hours found in preferences');
      }
    } else {
      console.log('⚠️ No preferences found for provider');
    }

    // Check if there's any availability data
    const { data: availability, error: availError } = await supabase
      .from('provider_availability')
      .select('*')
      .eq('provider_id', provider.id)
      .order('effective_date', { ascending: true })
      .limit(10);

    if (availError) {
      console.error('❌ Error fetching availability:', availError);
      return;
    }

    console.log(`📅 Found ${availability.length} availability slots:`);
    availability.forEach((slot, index) => {
      const date = new Date(slot.effective_date);
      const dayName = date.toLocaleDateString('en-US', { weekday: 'long' });
      console.log(`  ${index + 1}. ${slot.effective_date} (${dayName}) - ${slot.start_time} to ${slot.end_time} (day_of_week: ${slot.day_of_week})`);
    });

  } catch (error) {
    console.error('❌ Check failed:', error);
  }
}

checkProviderSettings();
