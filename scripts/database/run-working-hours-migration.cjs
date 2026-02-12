// Script to run working hours migration
const { createClient } = require('@supabase/supabase-js');

async function runMigration() {
  console.log('=== Running Working Hours Migration ===');
  
  try {
    const supabase = createClient(
      'https://gpalzskadkrfedlwqobq.supabase.co',
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdwYWx6c2thhZGtyZWRsd3dxb2JxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODk5Njg3NywiZXhwIjoyMDg0NTcyODc3fQ.DEBEmRaiuYAmqzuve-4WO7j_OI388BM_wMsCwT9OBmE',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    console.log('🔧 Adding working_hours column to provider_preferences table...');
    
    // Run the migration SQL
    const { data, error } = await supabase.rpc('exec_sql', {
      sql: `
        -- Add working_hours column as JSONB to store daily working hours
        ALTER TABLE public.provider_preferences 
        ADD COLUMN IF NOT EXISTS working_hours JSONB DEFAULT '{
          "monday": {"enabled": false, "startTime": "09:00", "endTime": "17:00"},
          "tuesday": {"enabled": false, "startTime": "09:00", "endTime": "17:00"},
          "wednesday": {"enabled": false, "startTime": "09:00", "endTime": "17:00"},
          "thursday": {"enabled": false, "startTime": "09:00", "endTime": "17:00"},
          "friday": {"enabled": false, "startTime": "09:00", "endTime": "17:00"},
          "saturday": {"enabled": false, "startTime": "09:00", "endTime": "17:00"},
          "sunday": {"enabled": false, "startTime": "09:00", "endTime": "17:00"}
        }'::jsonb;

        -- Add comment
        COMMENT ON COLUMN public.provider_preferences.working_hours IS 'Provider working hours configuration for each day of the week';

        -- Create index for better performance
        CREATE INDEX IF NOT EXISTS idx_provider_preferences_working_hours ON public.provider_preferences USING GIN (working_hours);

        -- Update existing records to have default working hours
        UPDATE public.provider_preferences 
        SET working_hours = '{
          "monday": {"enabled": false, "startTime": "09:00", "endTime": "17:00"},
          "tuesday": {"enabled": false, "startTime": "09:00", "endTime": "17:00"},
          "wednesday": {"enabled": false, "startTime": "09:00", "endTime": "17:00"},
          "thursday": {"enabled": false, "startTime": "09:00", "endTime": "17:00"},
          "friday": {"enabled": false, "startTime": "09:00", "endTime": "17:00"},
          "saturday": {"enabled": false, "startTime": "09:00", "endTime": "17:00"},
          "sunday": {"enabled": false, "startTime": "09:00", "endTime": "17:00"}
        }'::jsonb
        WHERE working_hours IS NULL;
      `
    });

    if (error) {
      console.error('❌ Migration failed:', error);
      console.log('\n💡 Alternative: Run SQL manually:');
      console.log('ALTER TABLE public.provider_preferences ADD COLUMN working_hours JSONB DEFAULT \'{}\'::jsonb;');
      return;
    }

    console.log('✅ Migration completed successfully!');
    console.log('🎯 Working hours column is now available');
    console.log('📝 The settings API should now work correctly');

  } catch (error) {
    console.error('❌ Migration script failed:', error);
  }
}

runMigration();
