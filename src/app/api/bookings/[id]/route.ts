import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { createAdminNotification } from '@/lib/adminProviderSync';
import { getCancellationFeeForBooking } from '@/lib/cancellationFee';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Get auth token from header
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized - No token' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');
    
    // Verify user session with token
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized - Invalid token' }, { status: 401 });
    }

    // Get business context from headers
    const businessId = request.headers.get('x-business-id');
    if (!businessId) {
      return NextResponse.json({ error: 'Business context required' }, { status: 400 });
    }

    // Get booking by ID
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select('*')
      .eq('id', params.id)
      .eq('business_id', businessId)
      .single();

    if (bookingError) {
      return NextResponse.json({ error: bookingError.message }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: booking
    });

  } catch (error) {
    console.error('Get booking API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Get auth token from header
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized - No token' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');
    
    // Verify user session with token
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized - Invalid token' }, { status: 401 });
    }

    // Get business context from headers
    const businessId = request.headers.get('x-business-id');
    if (!businessId) {
      return NextResponse.json({ error: 'Business context required' }, { status: 400 });
    }

    // Verify user has permission to update bookings
    const { data: businessAccess, error: accessError } = await supabase
      .from('businesses')
      .select('id, owner_id')
      .eq('owner_id', user.id)
      .eq('id', businessId)
      .single();

    if (accessError || !businessAccess) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    // Parse request body
    const updateData = await request.json();

    if (updateData.status === 'cancelled') {
      const { data: existing } = await supabase
        .from('bookings')
        .select('id, business_id, scheduled_date, scheduled_time, date, time, service_id, exclude_cancellation_fee')
        .eq('id', params.id)
        .eq('business_id', businessId)
        .single();
      if (existing?.business_id && !existing.exclude_cancellation_fee) {
        const { data: cancelSettings } = await supabase
          .from('business_cancellation_settings')
          .select('settings')
          .eq('business_id', existing.business_id)
          .maybeSingle();
        let categoryFee = null;
        if (existing.service_id) {
          const { data: cat } = await supabase
            .from('industry_service_category')
            .select('cancellation_fee')
            .eq('id', existing.service_id)
            .eq('business_id', existing.business_id)
            .maybeSingle();
          if (cat?.cancellation_fee) categoryFee = cat.cancellation_fee as Record<string, unknown>;
        }
        const fee = getCancellationFeeForBooking(
          existing,
          (cancelSettings?.settings as Record<string, unknown>) || null,
          categoryFee
        );
        if (fee) {
          updateData.cancellation_fee_amount = fee.amount;
          updateData.cancellation_fee_currency = fee.currency;
        }
      } else if (existing?.exclude_cancellation_fee) {
        updateData.cancellation_fee_amount = null;
        updateData.cancellation_fee_currency = null;
      }
    }

    // Update booking
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .update(updateData)
      .eq('id', params.id)
      .eq('business_id', businessId)
      .select()
      .single();

    if (bookingError) {
      return NextResponse.json({ error: bookingError.message }, { status: 500 });
    }

    const bkRef = `BK${String(params.id).slice(-6).toUpperCase()}`;
    await createAdminNotification(businessId, 'booking_modified', {
      title: 'Booking modified',
      message: `Booking ${bkRef} has been updated.`,
      link: '/admin/bookings',
    });

    return NextResponse.json({
      success: true,
      data: booking,
      message: 'Booking updated successfully'
    });

  } catch (error) {
    console.error('Update booking API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Get auth token from header
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized - No token' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');
    
    // Verify user session with token
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized - Invalid token' }, { status: 401 });
    }

    // Get business context from headers
    const businessId = request.headers.get('x-business-id');
    if (!businessId) {
      return NextResponse.json({ error: 'Business context required' }, { status: 400 });
    }

    // Verify user has permission to delete bookings
    const { data: businessAccess, error: accessError } = await supabase
      .from('businesses')
      .select('id, owner_id')
      .eq('owner_id', user.id)
      .eq('id', businessId)
      .single();

    if (accessError || !businessAccess) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    // Delete booking
    const { error: bookingError } = await supabase
      .from('bookings')
      .delete()
      .eq('id', params.id)
      .eq('business_id', businessId);

    if (bookingError) {
      return NextResponse.json({ error: bookingError.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'Booking deleted successfully'
    });

  } catch (error) {
    console.error('Delete booking API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
