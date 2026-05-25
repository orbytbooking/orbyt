// Test the generate slots API endpoint with simple auth
const { createClient } = require('@supabase/supabase-js');

async function testGenerateSlotsAPI() {
  console.log('=== Testing Generate Slots API ===');
  
  try {
    // Use service role key for admin access
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

    // Get user to create a session
    const { data: { user }, error: authError } = await supabase.auth.signInWithPassword({
      email: 'test@example.com',
      password: 'password'
    });

    if (authError) {
      console.log('ℹ️ Could not sign in with test credentials, trying direct API test...');
    }

    // Test working hours
    const testWorkingHours = {
      monday: { enabled: true, startTime: "09:00", endTime: "17:00" },
      tuesday: { enabled: false, startTime: "09:00", endTime: "17:00" },
      wednesday: { enabled: false, startTime: "09:00", endTime: "17:00" },
      thursday: { enabled: true, startTime: "09:00", endTime: "17:00" },
      friday: { enabled: false, startTime: "09:00", endTime: "17:00" },
      saturday: { enabled: false, startTime: "09:00", endTime: "17:00" },
      sunday: { enabled: false, startTime: "09:00", endTime: "17:00" },
    };

    // Test the API endpoint without auth first to see the error
    console.log('📡 Testing API without auth...');
    const response = await fetch('http://localhost:3000/api/provider/generate-slots', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        workingHours: testWorkingHours,
        startDate: '2026-02-01',
        endDate: '2026-02-28'
      })
    });

    console.log('📡 API Response status:', response.status);
    console.log('📡 API Response ok:', response.ok);

    const responseText = await response.text();
    console.log('📡 API Response:', responseText);

    if (response.ok) {
      const data = JSON.parse(responseText);
      console.log('✅ API Success:', data);
    } else {
      console.error('❌ API Error:', responseText);
      
      // Try with a fake token to see what happens
      console.log('\n📡 Testing API with fake auth...');
      const responseWithAuth = await fetch('http://localhost:3000/api/provider/generate-slots', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer fake-token'
        },
        body: JSON.stringify({
          workingHours: testWorkingHours,
          startDate: '2026-02-01',
          endDate: '2026-02-28'
        })
      });
      
      console.log('📡 API with auth status:', responseWithAuth.status);
      console.log('📡 API with auth response:', await responseWithAuth.text());
    }

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testGenerateSlotsAPI();
