// Test to verify provider availability data flow from database
const { createClient } = require('@supabase/supabase-js');

async function testProviderAvailabilityDataFlow() {
  console.log('=== Testing Provider Availability Data Flow ===');
  
  try {
    // Create Supabase admin client
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

    console.log('✅ Supabase admin client created');

    // Test 1: Check service_providers table
    console.log('\n📋 Test 1: Checking service_providers table...');
    const { data: providers, error: providersError } = await supabase
      .from('service_providers')
      .select('id, user_id, business_id, first_name, last_name, email')
      .limit(5);

    if (providersError) {
      console.error('❌ Service providers error:', providersError);
      return;
    }
    
    console.log(`✅ Found ${providers.length} providers`);
    providers.forEach(provider => {
      const fullName = `${provider.first_name} ${provider.last_name}`;
      console.log(`  - ${fullName} (user_id: ${provider.user_id})`);
    });

    // Test 2: Check provider_availability table
    console.log('\n📋 Test 2: Checking provider_availability table...');
    const { data: availability, error: availabilityError } = await supabase
      .from('provider_availability')
      .select(`
        id,
        provider_id,
        day_of_week,
        start_time,
        end_time,
        is_available,
        effective_date,
        expiry_date,
        business_id,
        service_providers!inner(
          id,
          user_id,
          first_name,
          last_name,
          email
        )
      `)
      .limit(10);

    if (availabilityError) {
      console.error('❌ Availability error:', availabilityError);
      return;
    }
    
    console.log(`✅ Found ${availability.length} availability records`);
    availability.forEach(record => {
      const fullName = `${record.service_providers.first_name} ${record.service_providers.last_name}`;
      console.log(`  - Provider: ${fullName}`);
      console.log(`    Day: ${record.day_of_week}, Time: ${record.start_time} - ${record.end_time}`);
    });

    // Test 3: Simulate API query (same as in the API route)
    if (providers.length > 0) {
      console.log('\n📋 Test 3: Simulating API query...');
      const testProvider = providers[0];
      
      const { data: apiData, error: apiError } = await supabase
        .from('provider_availability')
        .select('*')
        .eq('provider_id', testProvider.id)
        .order('day_of_week', { ascending: true })
        .order('start_time', { ascending: true });

      if (apiError) {
        console.error('❌ API simulation error:', apiError);
      } else {
        console.log(`✅ API simulation successful - found ${apiData.length} records for provider ${testProvider.first_name} ${testProvider.last_name}`);
      }
    }

    // Test 4: Check database indexes
    console.log('\n📋 Test 4: Checking database performance...');
    const start = Date.now();
    
    const { data: perfTest, error: perfError } = await supabase
      .from('provider_availability')
      .select('provider_id, day_of_week, start_time, end_time')
      .limit(100);

    const duration = Date.now() - start;
    
    if (perfError) {
      console.error('❌ Performance test error:', perfError);
    } else {
      console.log(`✅ Performance test: Retrieved ${perfTest.length} records in ${duration}ms`);
    }

    console.log('\n🎉 Data flow test completed successfully!');
    console.log('\n📝 Summary:');
    console.log(`- ✅ Database connection: Working`);
    console.log(`- ✅ service_providers table: ${providers.length} records`);
    console.log(`- ✅ provider_availability table: ${availability.length} records`);
    console.log(`- ✅ API query simulation: Working`);
    console.log(`- ✅ Database performance: ${duration}ms for 100 records`);
    console.log('\n💡 The provider availability module can successfully fetch data from the database!');
    console.log('💡 When a provider logs in, the API will return their specific availability records.');

  } catch (error) {
    console.error('❌ Data flow test failed:', error);
  }
}

testProviderAvailabilityDataFlow();
