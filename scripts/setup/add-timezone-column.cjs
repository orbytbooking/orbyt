// Script to add timezone column to provider_preferences table
const { createClient } = require('@supabase/supabase-js');

async function addTimezoneColumn() {
  console.log('=== Adding Timezone Column to Provider Preferences ===');
  
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

    console.log('📋 Step 1: Checking if timezone column exists...');
    
    // Check if column exists by trying to select it
    const { data: testData, error: testError } = await supabase
      .from('provider_preferences')
      .select('timezone')
      .limit(1);

    if (testError && testError.message.includes('column "timezone" does not exist')) {
      console.log('❌ Timezone column does not exist, adding it...');
      
      // Use raw SQL to add the column
      const { data: sqlData, error: sqlError } = await supabase
        .rpc('exec_sql', {
          sql: `
            ALTER TABLE public.provider_preferences 
            ADD COLUMN timezone TEXT DEFAULT 'Asia/Manila';
            
            COMMENT ON COLUMN public.provider_preferences.timezone IS 'Provider timezone for availability calculations';
            
            CREATE INDEX IF NOT EXISTS idx_provider_preferences_timezone ON public.provider_preferences(timezone);
            
            UPDATE public.provider_preferences 
            SET timezone = 'Asia/Manila' 
            WHERE timezone IS NULL;
          `
        });

      if (sqlError) {
        console.error('❌ Error adding timezone column:', sqlError);
        
        // Try alternative approach using direct SQL
        console.log('🔄 Trying alternative approach...');
        
        // Since we can't run raw SQL directly, let's try to update existing records
        // and handle the column addition manually
        console.log('⚠️ Please add the timezone column manually using the SQL migration script');
        console.log('📁 File: database/migrations/008_add_timezone_to_provider_preferences.sql');
        
        return;
      }
      
      console.log('✅ Timezone column added successfully!');
    } else if (testError) {
      console.error('❌ Other error checking timezone column:', testError);
      return;
    } else {
      console.log('✅ Timezone column already exists!');
    }

    console.log('📋 Step 2: Testing timezone column...');
    
    // Test the column by updating a record
    const { data: provider, error: providerError } = await supabase
      .from('service_providers')
      .select('id')
      .not('user_id', 'is', null)
      .limit(1)
      .single();

    if (providerError || !provider) {
      console.log('ℹ️ No provider found for testing');
    } else {
      // Test updating preferences with timezone
      const { data: updateData, error: updateError } = await supabase
        .from('provider_preferences')
        .upsert({
          provider_id: provider.id,
          business_id: provider.business_id || 'test-business-id',
          timezone: 'Asia/Manila',
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (updateError) {
        console.error('❌ Error testing timezone update:', updateError);
      } else {
        console.log('✅ Timezone column test successful!');
        console.log('📊 Updated preferences:', updateData);
      }
    }

    console.log('\n🎉 Timezone column setup complete!');
    console.log('\n💡 Next steps:');
    console.log('1. Try saving provider settings again');
    console.log('2. The timezone field should now work properly');
    console.log('3. Verify the timezone is saved and loaded correctly');

  } catch (error) {
    console.error('❌ Setup failed:', error);
  }
}

addTimezoneColumn();
