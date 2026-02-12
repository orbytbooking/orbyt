import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET(request: NextRequest) {
  try {
    console.log('=== PROVIDER AVAILABILITY API ===');
    
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

    // Get provider availability from database
    const { data: availability, error: availabilityError } = await supabaseAdmin
      .from('provider_availability')
      .select('*')
      .eq('provider_id', provider.id)
      .order('day_of_week', { ascending: true })
      .order('start_time', { ascending: true });

    if (availabilityError) {
      console.error('Error fetching availability:', availabilityError);
      return NextResponse.json(
        { error: 'Failed to fetch availability' },
        { status: 500 }
      );
    }

    return NextResponse.json(availability || []);

  } catch (error) {
    console.error('Availability API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log('=== CREATE AVAILABILITY SLOT API ===');
    
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

    const { date, startTime, endTime } = await request.json();

    if (!date || !startTime || !endTime) {
      return NextResponse.json(
        { error: 'Date, start time, and end time are required' },
        { status: 400 }
      );
    }

    // Convert date to day of week (0 = Sunday, 1 = Monday, etc.)
    // Use UTC to avoid timezone issues
    const bookingDate = new Date(date + 'T00:00:00Z');
    const dayOfWeek = bookingDate.getUTCDay();
    
    console.log('🔍 API Date calculation:');
    console.log(`  - Input date: ${date}`);
    console.log(`  - UTC Date: ${bookingDate.toUTCString()}`);
    console.log(`  - getUTCDay(): ${dayOfWeek} (0=Sunday, 6=Saturday)`);

    // Create availability slot in database
    const { data: newSlot, error: insertError } = await supabaseAdmin
      .from('provider_availability')
      .insert({
        provider_id: provider.id,
        business_id: provider.business_id,
        day_of_week: dayOfWeek,
        start_time: startTime,
        end_time: endTime,
        is_available: true,
        effective_date: date,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error creating availability slot:', insertError);
      console.error('Error details:', {
        message: insertError.message,
        details: insertError.details,
        hint: insertError.hint,
        code: insertError.code
      });
      return NextResponse.json(
        { 
          error: 'Failed to create availability slot',
          details: insertError.message,
          code: insertError.code
        },
        { status: 500 }
      );
    }

    // Sync availability update to admin dashboard
    // Update provider's last_active_at to trigger admin refresh
    await supabaseAdmin
      .from('service_providers')
      .update({
        updated_at: new Date().toISOString(),
        last_active_at: new Date().toISOString()
      })
      .eq('id', provider.id)
      .eq('business_id', provider.business_id);

    return NextResponse.json(newSlot);

  } catch (error) {
    console.error('Create availability API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    console.log('=== DELETE AVAILABILITY SLOT API ===');
    
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

    const { searchParams } = new URL(request.url);
    const slotId = searchParams.get('slotId');

    if (!slotId) {
      return NextResponse.json(
        { error: 'Slot ID is required' },
        { status: 400 }
      );
    }

    // Delete availability slot from database (ensure it belongs to this provider and business)
    const { error: deleteError } = await supabaseAdmin
      .from('provider_availability')
      .delete()
      .eq('id', slotId)
      .eq('provider_id', provider.id)
      .eq('business_id', provider.business_id);

    if (deleteError) {
      console.error('Error deleting availability slot:', deleteError);
      return NextResponse.json(
        { error: 'Failed to delete availability slot' },
        { status: 500 }
      );
    }

    // Sync availability update to admin dashboard
    // Update provider's last_active_at to trigger admin refresh
    await supabaseAdmin
      .from('service_providers')
      .update({
        updated_at: new Date().toISOString(),
        last_active_at: new Date().toISOString()
      })
      .eq('id', provider.id)
      .eq('business_id', provider.business_id);

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Delete availability API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
