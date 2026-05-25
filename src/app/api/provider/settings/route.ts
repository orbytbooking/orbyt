import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET(request: NextRequest) {
  try {
    console.log('=== PROVIDER SETTINGS API ===');
    
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

    // Fetch industries for this business
    const { data: industries, error: industriesError } = await supabaseAdmin
      .from('industries')
      .select('*')
      .eq('business_id', provider.business_id);

    if (industriesError) {
      console.error('Error fetching industries:', industriesError);
    }

    // Fetch provider preferences
    const { data: preferences, error: preferencesError } = await supabaseAdmin
      .from('provider_preferences')
      .select('*')
      .eq('provider_id', provider.id)
      .single();

    if (preferencesError && preferencesError.code !== 'PGRST116') {
      console.error('Error fetching preferences:', preferencesError);
    }

    // Fetch working hours from recurring availability slots
    const { data: availabilitySlots, error: availabilityError } = await supabaseAdmin
      .from('provider_availability')
      .select('day_of_week, start_time, end_time')
      .eq('provider_id', provider.id)
      .is('effective_date', null); // Only get recurring slots

    if (availabilityError) {
      console.error('Error fetching availability:', availabilityError);
    }

    // Reconstruct workingHours from availability slots
    const workingHours = {
      sunday: { enabled: false, startTime: "09:00", endTime: "17:00" },
      monday: { enabled: false, startTime: "09:00", endTime: "17:00" },
      tuesday: { enabled: false, startTime: "09:00", endTime: "17:00" },
      wednesday: { enabled: false, startTime: "09:00", endTime: "17:00" },
      thursday: { enabled: false, startTime: "09:00", endTime: "17:00" },
      friday: { enabled: false, startTime: "09:00", endTime: "17:00" },
      saturday: { enabled: false, startTime: "09:00", endTime: "17:00" },
    };

    // Map day numbers to day names
    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

    // Update workingHours with actual availability data
    if (availabilitySlots) {
      availabilitySlots.forEach(slot => {
        const dayName = dayNames[slot.day_of_week];
        if (dayName && workingHours[dayName]) {
          workingHours[dayName] = {
            enabled: true,
            startTime: slot.start_time.substring(0, 5), // Remove seconds
            endTime: slot.end_time.substring(0, 5) // Remove seconds
          };
        }
      });
    }

    console.log('Reconstructed workingHours:', workingHours);

    return NextResponse.json({
      provider,
      industries: industries || [],
      preferences: preferences || null,
      workingHours: workingHours
    });

  } catch (error) {
    console.error('Settings API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    console.log('=== UPDATE PROVIDER SETTINGS API ===');
    
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
    console.log('🔍 Auth header:', authHeader ? 'Present' : 'Missing');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.error('❌ No auth token found');
      return NextResponse.json(
        { error: 'Unauthorized - No token' },
        { status: 401 }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    console.log('🔍 Token length:', token.length);
    
    // Verify user session with token
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    console.log('🔍 Auth result:', { user: user?.id, error: authError?.message });
    
    if (authError || !user) {
      console.error('❌ Auth error:', authError);
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

    console.log('🔍 Provider result:', { provider: provider?.id, error: providerError?.message });

    if (providerError || !provider) {
      console.error('❌ Provider not found:', providerError);
      return NextResponse.json(
        { error: 'Provider not found' },
        { status: 404 }
      );
    }

    const settings = await request.json();
    console.log('🔍 Settings received:', JSON.stringify(settings, null, 2));

    // Update provider preferences
    const { data: updatedPreferences, error: updateError } = await supabaseAdmin
      .from('provider_preferences')
      .upsert({
        provider_id: provider.id,
        // business_id: provider.business_id, // This column doesn't exist in the table
        auto_assignments: settings.availability?.acceptEmergencyBookings || false,
        email_notifications: settings.notifications?.email || true,
        sms_notifications: settings.notifications?.sms || false,
        advance_booking_days: settings.availability?.advanceBookingDays || 7,
        minimum_booking_notice_hours: settings.availability?.minimumNoticeHours || 2,
        accepts_emergency_bookings: settings.availability?.acceptEmergencyBookings || false,
        // TODO: Add timezone field after database migration
        // timezone: settings.availability?.timezone || 'Asia/Manila',
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (updateError) {
      console.error('Error updating preferences:', updateError);
      return NextResponse.json(
        { error: 'Failed to update settings' },
        { status: 500 }
      );
    }

    // Sync settings update to admin dashboard
    // Update provider's updated_at to trigger admin refresh
    await supabaseAdmin
      .from('service_providers')
      .update({
        updated_at: new Date().toISOString()
      })
      .eq('id', provider.id)
      .eq('business_id', provider.business_id);

    return NextResponse.json({
      success: true,
      preferences: updatedPreferences
    });

  } catch (error) {
    console.error('Update settings API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
