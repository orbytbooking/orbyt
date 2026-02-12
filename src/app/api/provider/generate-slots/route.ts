// API to generate availability slots from working hours
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(request: NextRequest) {
  try {
    console.log('=== GENERATE SLOTS FROM WORKING HOURS ===');
    
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

    // Get auth token
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Unauthorized - No token' },
        { status: 401 }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    
    // Verify user session
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized - Invalid token' },
        { status: 401 }
      );
    }

    // Get provider data
    const { data: provider, error: providerError } = await supabaseAdmin
      .from('service_providers')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (providerError || !provider) {
      return NextResponse.json(
        { error: 'Provider not found' },
        { status: 404 }
      );
    }

    const { workingHours, startDate, endDate } = await request.json();
    console.log('🔍 Working hours received:', workingHours);
    console.log('📅 Date range:', { startDate, endDate });

    // Generate slots for each enabled day
    const generatedSlots = [];
    const start = new Date(startDate);
    // Limit to 3 months max to prevent timeout
    const maxEndDate = new Date(startDate);
    maxEndDate.setMonth(maxEndDate.getMonth() + 3);
    const limitedEndDate = new Date(endDate) > maxEndDate ? maxEndDate.toISOString().split('T')[0] : endDate;

    // Map day names to day numbers (0 = Sunday, 1 = Monday, etc.)
    const dayMap = {
      sunday: 0,
      monday: 1,
      tuesday: 2,
      wednesday: 3,
      thursday: 4,
      friday: 5,
      saturday: 6
    };

    for (let date = new Date(start); date <= limitedEndDate; date.setDate(date.getDate() + 1)) {
      const dayOfWeek = date.getUTCDay(); // Use UTC for consistency
      const dayName = Object.keys(dayMap).find(key => dayMap[key] === dayOfWeek);
      
      if (dayName && workingHours[dayName]?.enabled) {
        const hours = workingHours[dayName];
        const dateStr = date.toISOString().split('T')[0];
        
        console.log(`📅 Generating slots for ${dateStr} (${dayName})`);
        
        // Create slot for this day
        const slot = {
          provider_id: provider.id,
          business_id: provider.business_id,
          day_of_week: dayOfWeek,
          start_time: hours.startTime + ':00',
          end_time: hours.endTime + ':00',
          is_available: true,
          effective_date: dateStr,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
        
        generatedSlots.push(slot);
      }
    }

    console.log(`📊 Generated ${generatedSlots.length} slots`);

    // Clear existing slots in date range
    const { error: deleteError } = await supabaseAdmin
      .from('provider_availability')
      .delete()
      .eq('provider_id', provider.id)
      .gte('effective_date', startDate)
      .lte('effective_date', limitedEndDate);

    if (deleteError) {
      console.error('❌ Error clearing existing slots:', deleteError);
      return NextResponse.json(
        { error: 'Failed to clear existing slots' },
        { status: 500 }
      );
    }

    // Insert new slots
    if (generatedSlots.length > 0) {
      const { data: insertedSlots, error: insertError } = await supabaseAdmin
        .from('provider_availability')
        .insert(generatedSlots)
        .select();

      if (insertError) {
        console.error('❌ Error inserting slots:', insertError);
        return NextResponse.json(
          { error: 'Failed to generate slots' },
          { status: 500 }
        );
      }

      console.log(`✅ Successfully inserted ${insertedSlots.length} slots`);
      return NextResponse.json({
        success: true,
        message: `Generated ${insertedSlots.length} slots from working hours`,
        slots: insertedSlots
      });
    }

    return NextResponse.json({
      success: true,
      message: 'No slots generated (no working hours enabled)'
    });

  } catch (error) {
    console.error('Error generating slots:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
