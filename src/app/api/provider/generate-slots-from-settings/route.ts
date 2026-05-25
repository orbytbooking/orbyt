import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(request: NextRequest) {
  try {
    console.log('=== GENERATE SLOTS FROM SETTINGS API ===');
    
    // Create service role client for server-side operations
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    // Get auth token from header
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Unauthorized - No token' },
        { status: 401 }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    
    // Verify user session with token
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !user) {
      console.error('Auth error:', authError);
      return NextResponse.json(
        { error: 'Unauthorized - Invalid token' },
        { status: 401 }
      );
    }

    // Get provider data
    console.log('🔍 Looking up provider for user_id:', user.id);
    const { data: provider, error: providerError } = await supabaseAdmin
      .from('service_providers')
      .select('*')
      .eq('user_id', user.id)
      .single();

    console.log('📊 Provider query result:', { provider, error: providerError });

    if (providerError || !provider) {
      console.error('❌ Provider not found error:', providerError);
      return NextResponse.json(
        { error: 'Provider not found', details: providerError?.message },
        { status: 404 }
      );
    }

    const { workingHours } = await request.json();

    if (!workingHours) {
      return NextResponse.json(
        { error: 'Working hours are required' },
        { status: 400 }
      );
    }

    console.log('🔍 Working hours received:', workingHours);
    console.log('🔍 Working hours type:', typeof workingHours);
    console.log('🔍 Working hours keys:', Object.keys(workingHours));
    
    // Validate working hours structure
    const expectedDays = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const receivedDays = Object.keys(workingHours).map(day => day.toLowerCase());
    
    console.log('🔍 Expected days:', expectedDays);
    console.log('🔍 Received days:', receivedDays);
    
    // Check for any unexpected days
    const unexpectedDays = receivedDays.filter(day => !expectedDays.includes(day));
    if (unexpectedDays.length > 0) {
      console.warn('⚠️ Unexpected days found:', unexpectedDays);
    }
    
    // Debug each day's configuration
    Object.entries(workingHours).forEach(([day, config]) => {
      const dayConfig = config as { enabled?: boolean; startTime?: string; endTime?: string };
      console.log(`🔍 Day ${day}:`, {
        enabled: dayConfig?.enabled,
        startTime: dayConfig?.startTime,
        endTime: dayConfig?.endTime,
        configType: typeof config
      });
    });

    // Day mapping for API
    const dayMapping: { [key: string]: number } = {
      'sunday': 0,
      'monday': 1,
      'tuesday': 2,
      'wednesday': 3,
      'thursday': 4,
      'friday': 5,
      'saturday': 6
    };

    const results = [];
    const errors = [];

    // Process each day
    for (const [dayName, dayConfig] of Object.entries(workingHours)) {
      const dayOfWeek = dayMapping[dayName.toLowerCase()];
      
      if (dayOfWeek === undefined) {
        console.warn(`⚠️ Unknown day: ${dayName}`);
        continue;
      }

      const config = dayConfig as any;
      console.log(`🔍 Processing ${dayName} (day ${dayOfWeek}): enabled=${config.enabled}, ${config.startTime} - ${config.endTime}`);
      
      // Only process this specific day if it's enabled
      if (config.enabled) {
        try {
          console.log(`📅 Creating RECURRING slot for ${dayName} (day ${dayOfWeek}): ${config.startTime} - ${config.endTime}`);

          // First, delete ALL existing RECURRING slots for this specific day (not custom date slots)
          const { error: deleteError } = await supabaseAdmin
            .from('provider_availability')
            .delete()
            .eq('provider_id', provider.id)
            .eq('business_id', provider.business_id)
            .eq('day_of_week', dayOfWeek)
            .is('effective_date', null); // Only delete recurring slots

          if (deleteError) {
            console.error(`❌ Error deleting existing slots for ${dayName}:`, deleteError);
            errors.push({ day: dayName, error: deleteError.message });
            continue;
          }

          console.log(`🗑️ Deleted existing RECURRING slots for ${dayName}`);

          // Create new recurring slot for this specific day only
          const { data: newSlot, error: insertError } = await supabaseAdmin
            .from('provider_availability')
            .insert({
              provider_id: provider.id,
              business_id: provider.business_id,
              day_of_week: dayOfWeek,
              start_time: config.startTime + ':00',
              end_time: config.endTime + ':00',
              is_available: true,
              effective_date: null, // null means recurring every week
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            })
            .select()
            .single();

          if (insertError) {
            console.error(`❌ Error creating slot for ${dayName}:`, insertError);
            errors.push({ day: dayName, error: insertError.message });
          } else {
            console.log(`✅ Created RECURRING slot for ${dayName} (day ${dayOfWeek}):`, newSlot);
            results.push({ day: dayName, dayOfWeek, slot: newSlot });
          }
        } catch (error) {
          console.error(`❌ Error processing ${dayName}:`, error);
          errors.push({ day: dayName, error: error.message });
        }
      } else {
        // Day is disabled, delete existing RECURRING slots for this specific day only (not custom date slots)
        try {
          console.log(`🗑️ Deleting RECURRING slots for disabled ${dayName} (day ${dayOfWeek})`);

          const { error: deleteError } = await supabaseAdmin
            .from('provider_availability')
            .delete()
            .eq('provider_id', provider.id)
            .eq('business_id', provider.business_id)
            .eq('day_of_week', dayOfWeek)
            .is('effective_date', null); // Only delete recurring slots

          if (deleteError) {
            console.error(`❌ Error deleting slots for ${dayName}:`, deleteError);
            errors.push({ day: dayName, error: deleteError.message });
          } else {
            console.log(`✅ Deleted RECURRING slots for ${dayName} (day ${dayOfWeek})`);
            results.push({ day: dayName, dayOfWeek, deleted: true });
          }
        } catch (error) {
          console.error(`❌ Error deleting ${dayName}:`, error);
          errors.push({ day: dayName, error: error.message });
        }
      }
    }

    console.log('📊 Generation complete:', { results, errors });

    return NextResponse.json({
      success: true,
      message: `Processed ${results.length} days successfully`,
      results,
      errors: errors.length > 0 ? errors : undefined
    });

  } catch (error) {
    console.error('Generate slots from settings API error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}
