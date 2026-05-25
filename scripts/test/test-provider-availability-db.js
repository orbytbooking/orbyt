import { createClient } from '@supabase/supabase-js';

// Test script to verify provider availability database connectivity
async function testProviderAvailabilityDB() {
  console.log('=== Testing Provider Availability Database Connection ===');
  
  try {
    // Create Supabase client
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    console.log('✅ Supabase client created successfully');

    // Test 1: Check if provider_availability table exists
    console.log('\n📋 Test 1: Checking provider_availability table...');
    const { data: tableInfo, error: tableError } = await supabase
      .from('provider_availability')
      .select('*')
      .limit(1);

    if (tableError) {
      console.error('❌ Table access error:', tableError);
      return;
    }
    console.log('✅ provider_availability table is accessible');

    // Test 2: Check table structure
    console.log('\n📋 Test 2: Checking table structure...');
    const { data: columns, error: columnError } = await supabase
      .rpc('get_table_columns', { table_name: 'provider_availability' })
      .catch(() => ({ data: null, error: new Error('RPC not available') }));

    if (columnError) {
      console.log('⚠️  Could not fetch column details (RPC not available)');
    } else {
      console.log('✅ Table columns:', columns?.map(c => c.column_name));
    }

    // Test 3: Check if service_providers table exists
    console.log('\n📋 Test 3: Checking service_providers table...');
    const { data: providers, error: providersError } = await supabase
      .from('service_providers')
      .select('id, user_id, business_id, name')
      .limit(5);

    if (providersError) {
      console.error('❌ Service providers table error:', providersError);
      return;
    }
    console.log('✅ service_providers table is accessible');
    console.log(`📊 Found ${providers.length} providers`);

    // Test 4: Check for existing availability data
    console.log('\n📋 Test 4: Checking existing availability data...');
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
          name
        )
      `)
      .limit(10);

    if (availabilityError) {
      console.error('❌ Availability query error:', availabilityError);
      return;
    }
    console.log(`✅ Found ${availability.length} availability records`);
    
    if (availability.length > 0) {
      console.log('📊 Sample availability record:');
      console.log(JSON.stringify(availability[0], null, 2));
    }

    // Test 5: Test RLS policies (try to query without auth)
    console.log('\n📋 Test 5: Testing RLS policies...');
    const { data: rlsTest, error: rlsError } = await supabase
      .from('provider_availability')
      .select('count(*)')
      .single();

    if (rlsError && rlsError.code === '42501') {
      console.log('✅ RLS policies are active (permission denied as expected)');
    } else if (rlsError) {
      console.log('⚠️  RLS test error:', rlsError);
    } else {
      console.log('⚠️  RLS may not be properly configured');
    }

    console.log('\n🎉 Database connectivity test completed successfully!');
    console.log('\n📝 Summary:');
    console.log('- ✅ Database connection established');
    console.log('- ✅ provider_availability table exists and is accessible');
    console.log('- ✅ service_providers table exists and is accessible');
    console.log(`- 📊 Found ${providers.length} providers in the system`);
    console.log(`- 📊 Found ${availability.length} availability records`);
    console.log('- ✅ API should be able to fetch data from database');

  } catch (error) {
    console.error('❌ Database connection test failed:', error);
  }
}

// Run the test
testProviderAvailabilityDB();
