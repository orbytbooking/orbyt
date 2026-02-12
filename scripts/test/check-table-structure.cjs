// Check actual table structure
const { createClient } = require('@supabase/supabase-js');

async function checkActualTableStructure() {
  console.log('=== Checking Actual Table Structure ===');
  
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

    // Get a provider first
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

    console.log('📊 Provider:', provider);

    // Try to insert with just provider_id to see what works
    const { data: testData, error: testError } = await supabase
      .from('provider_preferences')
      .insert({
        provider_id: provider.id,
        email_notifications: true,
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (testError) {
      console.error('❌ Basic insert failed:', testError);
    } else {
      console.log('✅ Basic insert works:', testData);
      
      // Now try to get the record to see what columns exist
      const { data: record, error: fetchError } = await supabase
        .from('provider_preferences')
        .select('*')
        .eq('provider_id', provider.id)
        .single();

      if (fetchError) {
        console.error('❌ Fetch failed:', fetchError);
      } else {
        console.log('✅ Record structure:', record);
        console.log('📋 Available columns:', Object.keys(record));
      }
    }

  } catch (error) {
    console.error('❌ Check failed:', error);
  }
}

checkActualTableStructure();
