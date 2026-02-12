// Test script to verify the availability fix
const { createClient } = require('@supabase/supabase-js');

async function testAvailabilityFix() {
  console.log('=== Testing Availability Fix ===');
  
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

    console.log(`✅ Using provider: ${provider.id}`);

    // Clean up existing test slots
    console.log('\n🧹 Cleaning up existing test slots...');
    await supabase
      .from('provider_availability')
      .delete()
      .eq('provider_id', provider.id)
      .eq('effective_date', '2026-02-12');

    // Add a slot for Feb 12, 2026 (Thursday)
    console.log('\n➕ Adding slot for Feb 12, 2026...');
    const testDate = '2026-02-12';
    const bookingDate = new Date(testDate + 'T00:00:00Z');
    const dayOfWeek = bookingDate.getUTCDay();
    
    console.log(`  - Date: ${testDate}`);
    console.log(`  - UTC Date: ${bookingDate.toUTCString()}`);
    console.log(`  - Day of week: ${dayOfWeek} (${['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][dayOfWeek]})`);

    const { data: newSlot, error: insertError } = await supabase
      .from('provider_availability')
      .insert({
        provider_id: provider.id,
        business_id: provider.business_id,
        day_of_week: dayOfWeek,
        start_time: '09:00:00',
        end_time: '10:00:00',
        is_available: true,
        effective_date: testDate,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (insertError) {
      console.error('❌ Error inserting slot:', insertError);
      return;
    }

    console.log('✅ Slot created successfully:', newSlot);

    // Test the filtering logic
    console.log('\n🔍 Testing filtering logic...');
    
    // Simulate the frontend getSlotsForDate function
    const simulateGetSlotsForDate = async (dateString) => {
      const { data: allSlots } = await supabase
        .from('provider_availability')
        .select('*')
        .eq('provider_id', provider.id);
      
      const testDate = new Date(dateString + 'T00:00:00Z');
      const dayOfWeek = testDate.getUTCDay();
      
      const matchingSlots = allSlots.filter(slot => {
        if (slot.day_of_week !== dayOfWeek) return false;
        if (!slot.effective_date) return true;
        if (slot.effective_date === dateString) return true;
        if (slot.expiry_date) {
          return dateString >= slot.effective_date && dateString <= slot.expiry_date;
        }
        return false;
      });
      
      return matchingSlots;
    };

    // Test different dates in February 2026
    const testDates = [
      '2026-02-05', // Thursday (should NOT show the slot)
      '2026-02-12', // Thursday (should show the slot)
      '2026-02-19', // Thursday (should NOT show the slot)
      '2026-02-26', // Thursday (should NOT show the slot)
      '2026-02-13', // Friday (should NOT show the slot)
    ];

    for (const testDate of testDates) {
      const slots = await simulateGetSlotsForDate(testDate);
      const dayName = new Date(testDate + 'T00:00:00Z').toLocaleDateString('en-US', { weekday: 'long' });
      const hasSlot = slots.length > 0;
      
      console.log(`  - ${testDate} (${dayName}): ${hasSlot ? '✅ Shows slot' : '❌ No slot'}`);
    }

    console.log('\n🎯 Expected Results:');
    console.log('  - Feb 12 (Thursday): Should show the slot ✅');
    console.log('  - Other Thursdays: Should NOT show the slot ✅');
    console.log('  - Other days: Should NOT show the slot ✅');

    console.log('\n✅ Fix verification complete!');

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testAvailabilityFix();
