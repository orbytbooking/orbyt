// Test to debug provider_preferences table structure
const { createClient } = require('@supabase/supabase-js');

async function debugProviderPreferencesTable() {
  console.log('=== Debugging Provider Preferences Table ===');
  
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

    console.log('📋 Step 1: Check if provider_preferences table exists...');
    
    // Try to select from the table
    const { data: testData, error: testError } = await supabase
      .from('provider_preferences')
      .select('*')
      .limit(1);

    if (testError) {
      console.error('❌ Error accessing provider_preferences:', testError);
      console.log('Error details:', {
        message: testError.message,
        code: testError.code,
        details: testError.details
      });
      
      // Check if table doesn't exist
      if (testError.message.includes('relation "provider_preferences" does not exist')) {
        console.log('🔧 Table does not exist. Creating it...');
        await createProviderPreferencesTable(supabase);
      } else if (testError.message.includes('column') && testError.message.includes('does not exist')) {
        console.log('🔧 Column missing. Need to add missing columns...');
        console.log('Missing column info:', testError.message);
      }
    } else {
      console.log('✅ provider_preferences table exists!');
      console.log('📊 Sample data:', testData);
      
      // Check table structure
      await checkTableStructure(supabase);
    }

    console.log('\n🎉 Debug complete!');

  } catch (error) {
    console.error('❌ Debug failed:', error);
  }
}

async function createProviderPreferencesTable(supabase) {
  console.log('🔧 Creating provider_preferences table...');
  
  // Since we can't run raw SQL directly, let's try to create a simple record
  // This will fail if the table doesn't exist, but we can catch the error
  
  // First, get a provider to use for testing
  const { data: provider, error: providerError } = await supabase
    .from('service_providers')
    .select('id, business_id')
    .not('user_id', 'is', null)
    .limit(1)
    .single();

  if (providerError || !provider) {
    console.error('❌ No provider found for table creation');
    return;
  }

  console.log('📊 Using provider:', provider.id);

  // Try to insert a record - this will fail if table doesn't exist
  const { data: insertData, error: insertError } = await supabase
    .from('provider_preferences')
    .insert({
      provider_id: provider.id,
      business_id: provider.business_id,
      email_notifications: true,
      sms_notifications: false,
      advance_booking_days: 7,
      minimum_booking_notice_hours: 2,
      accepts_emergency_bookings: false,
      auto_assignments: false,
      updated_at: new Date().toISOString()
    })
    .select()
    .single();

  if (insertError) {
    console.error('❌ Error inserting record:', insertError);
    console.log('💡 Table likely needs to be created manually');
    console.log('📁 Please run the SQL migration scripts to create the table');
  } else {
    console.log('✅ Record inserted successfully:', insertData);
  }
}

async function checkTableStructure(supabase) {
  console.log('📋 Step 2: Checking table structure...');
  
  // Try to insert a record with all possible fields to see what's missing
  const { data: provider, error: providerError } = await supabase
    .from('service_providers')
    .select('id, business_id')
    .not('user_id', 'is', null)
    .limit(1)
    .single();

  if (providerError || !provider) {
    console.error('❌ No provider found for structure check');
    return;
  }

  // Test record with all expected fields
  const testRecord = {
    provider_id: provider.id,
    business_id: provider.business_id,
    auto_assignments: false,
    email_notifications: true,
    sms_notifications: false,
    advance_booking_days: 7,
    minimum_booking_notice_hours: 2,
    accepts_emergency_bookings: false,
    preferred_payment_methods: ['bank_transfer'],
    updated_at: new Date().toISOString()
  };

  const { data: insertData, error: insertError } = await supabase
    .from('provider_preferences')
    .insert(testRecord)
    .select()
    .single();

  if (insertError) {
    console.error('❌ Error with full record:', insertError);
    console.log('💡 Some columns might be missing from the table');
    
    // Try with minimal fields
    const minimalRecord = {
      provider_id: provider.id,
      business_id: provider.business_id,
      email_notifications: true,
      updated_at: new Date().toISOString()
    };

    const { data: minimalData, error: minimalError } = await supabase
      .from('provider_preferences')
      .insert(minimalRecord)
      .select()
      .single();

    if (minimalError) {
      console.error('❌ Even minimal record failed:', minimalError);
    } else {
      console.log('✅ Minimal record works:', minimalData);
      console.log('💡 Table exists but has limited columns');
    }
  } else {
    console.log('✅ Full record works:', insertData);
    console.log('💡 Table structure is complete');
  }
}

debugProviderPreferencesTable();
