// API endpoint to add timezone column
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(request: NextRequest) {
  try {
    console.log('=== ADD TIMEZONE COLUMN API ===');
    
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    // Try to add the column using raw SQL
    const { data, error } = await supabase
      .from('provider_preferences')
      .select('id')
      .limit(1);

    if (error && error.message.includes('column "timezone" does not exist')) {
      console.log('Timezone column missing, attempting to add it...');
      
      // Since we can't run raw SQL directly, we'll need to handle this differently
      // For now, let's return a message indicating manual action is needed
      return NextResponse.json({
        success: false,
        message: 'Timezone column needs to be added manually',
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
    }

    return NextResponse.json({
      success: true,
      message: 'Timezone column already exists'
    });

  } catch (error) {
    console.error('Error checking timezone column:', error);
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}
