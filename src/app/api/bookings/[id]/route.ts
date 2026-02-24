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
    let updateData = await request.json();
    const bookingId = params.id;

    // If this is the add-booking form payload (full booking update), build DB-shaped update object
    if (updateData.customer_name !== undefined && typeof updateData.customer_name === 'string') {
      const bookingData = updateData as Record<string, unknown>;
      let paymentMethod = 'cash';
      if (bookingData.payment_method) {
        const method = String(bookingData.payment_method).toLowerCase();
        if (method === 'cash') paymentMethod = 'cash';
        else if (method.includes('card') || method.includes('bank') || method === 'credit card') paymentMethod = 'online';
      }
      const finalStatus = bookingData.service_provider_id
        ? (bookingData.status === 'pending' ? 'confirmed' : bookingData.status)
        : (bookingData.status || 'pending');
      let providerWage: number | null = null;
      let providerWageType: string | null = null;
      if (bookingData.provider_wage != null && bookingData.provider_wage_type) {
        const w = parseFloat(String(bookingData.provider_wage));
        if (!isNaN(w) && w >= 0) {
          providerWage = w;
          providerWageType = String(bookingData.provider_wage_type);
        }
      }
      let customerId: string | null = bookingData.customer_id && typeof bookingData.customer_id === 'string' ? bookingData.customer_id.trim() || null : null;
      const customerEmail = (bookingData.customer_email || '').toString().trim();
      const customerName = (bookingData.customer_name || '').toString().trim();
      const customerPhone = (bookingData.customer_phone || '').toString().trim() || null;
      const customerAddress = (bookingData.address || '').toString().trim() || null;
      if (!customerId && customerEmail) {
        const { data: existing } = await supabase
          .from('customers')
          .select('id')
          .eq('business_id', businessId)
          .ilike('email', customerEmail)
          .maybeSingle();
        if (existing?.id) customerId = existing.id;
        else if (customerName || customerEmail) {
          const { data: created } = await supabase
            .from('customers')
            .insert({
              business_id: businessId,
              name: customerName || customerEmail,
              email: customerEmail,
              phone: customerPhone,
              address: customerAddress,
            })
            .select('id')
            .single();
          if (created?.id) customerId = created.id;
        }
      }
      let providerName: string | null = (bookingData.provider_name || '').toString().trim() || null;
      const providerId = bookingData.service_provider_id || null;
      if (providerId && !providerName) {
        const { data: prov } = await supabase
          .from('service_providers')
          .select('first_name, last_name')
          .eq('id', providerId)
          .maybeSingle();
        if (prov) providerName = `${(prov.first_name || '').trim()} ${(prov.last_name || '').trim()}`.trim() || null;
      }
      const built: Record<string, unknown> = {
        provider_id: providerId,
        status: finalStatus,
        scheduled_date: bookingData.date ?? bookingData.scheduled_date ?? null,
        scheduled_time: bookingData.time ?? bookingData.scheduled_time ?? null,
        address: (bookingData.address || 'Default Address').toString(),
        apt_no: bookingData.apt_no ?? null,
        zip_code: bookingData.zip_code ?? null,
        notes: (bookingData.notes || '').toString(),
        total_price: bookingData.amount ?? bookingData.total_price ?? 0,
        payment_method: paymentMethod,
        customer_email: bookingData.customer_email ?? null,
        customer_name: bookingData.customer_name ?? null,
        customer_phone: bookingData.customer_phone ?? null,
        service: bookingData.service ?? null,
        date: bookingData.date ?? bookingData.scheduled_date ?? null,
        time: bookingData.time ?? bookingData.scheduled_time ?? null,
        customer_id: customerId,
        amount: bookingData.amount ?? bookingData.total_price ?? 0,
      };
      if (providerName) built.provider_name = providerName;
      const hasPartialCleaning = Boolean(bookingData.is_partial_cleaning);
      const excludedAreas = Array.isArray(bookingData.excluded_areas) ? bookingData.excluded_areas : [];
      const excludeQuantities = bookingData.exclude_quantities && typeof bookingData.exclude_quantities === 'object' && !Array.isArray(bookingData.exclude_quantities) ? bookingData.exclude_quantities : {};
      const hasCustomization = hasPartialCleaning || excludedAreas.length > 0 || Object.keys(excludeQuantities).length > 0 ||
        (Array.isArray(bookingData.selected_extras) && bookingData.selected_extras.length > 0) ||
        (bookingData.extra_quantities && typeof bookingData.extra_quantities === 'object' && Object.keys(bookingData.extra_quantities as object).length > 0) ||
        (bookingData.category_values && typeof bookingData.category_values === 'object' && Object.keys(bookingData.category_values as object).length > 0);
      if (hasCustomization) {
        built.customization = {
          ...(bookingData.customization && typeof bookingData.customization === 'object' ? bookingData.customization : {}),
          isPartialCleaning: hasPartialCleaning,
          excludedAreas,
          excludeQuantities,
          selectedExtras: Array.isArray(bookingData.selected_extras) ? bookingData.selected_extras : [],
          extraQuantities: bookingData.extra_quantities && typeof bookingData.extra_quantities === 'object' ? bookingData.extra_quantities : {},
          categoryValues: bookingData.category_values && typeof bookingData.category_values === 'object' ? bookingData.category_values : {},
        };
      }
      if (providerWage !== null && providerWageType) {
        built.provider_wage = providerWage;
        built.provider_wage_type = providerWageType;
      }
      if (bookingData.exclude_cancellation_fee === true) built.exclude_cancellation_fee = true;
      if (bookingData.exclude_customer_notification === true) built.exclude_customer_notification = true;
      if (bookingData.exclude_provider_notification === true) built.exclude_provider_notification = true;
      if (bookingData.adjust_service_total === true) {
        built.adjust_service_total = true;
        const serviceTotalAmt = parseFloat(String(bookingData.adjustment_service_total_amount));
        if (!isNaN(serviceTotalAmt)) built.adjustment_service_total_amount = serviceTotalAmt;
      } else {
        built.adjust_service_total = false;
        built.adjustment_service_total_amount = null;
      }
      if (bookingData.adjust_price === true) {
        built.adjust_price = true;
        const priceAmt = parseFloat(String(bookingData.adjustment_amount));
        if (!isNaN(priceAmt)) built.adjustment_amount = priceAmt;
      } else {
        built.adjust_price = false;
        built.adjustment_amount = null;
      }
      built.adjust_time = bookingData.adjust_time === true;
      built.private_booking_notes = Array.isArray(bookingData.private_booking_notes) ? bookingData.private_booking_notes.filter((n: unknown) => typeof n === 'string') : [];
      built.private_customer_notes = Array.isArray(bookingData.private_customer_notes) ? bookingData.private_customer_notes.filter((n: unknown) => typeof n === 'string') : [];
      built.service_provider_notes = Array.isArray(bookingData.service_provider_notes) ? bookingData.service_provider_notes.filter((n: unknown) => typeof n === 'string') : [];
      const durationVal = parseFloat(String(bookingData.duration));
      const durationUnit = (bookingData.duration_unit || 'Hours').toString();
      if (!isNaN(durationVal) && durationVal >= 0) {
        const durationMinutes = durationUnit.toLowerCase().includes('hour') ? Math.round(durationVal * 60) : Math.round(durationVal);
        if (durationMinutes > 0) built.duration_minutes = durationMinutes;
      }
      updateData = built;
    }

    if (updateData.status === 'cancelled') {
      const { data: existing } = await supabase
        .from('bookings')
        .select('id, business_id, scheduled_date, scheduled_time, date, time, service_id, exclude_cancellation_fee')
        .eq('id', bookingId)
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
      .eq('id', bookingId)
      .eq('business_id', businessId)
      .select()
      .single();

    if (bookingError) {
      return NextResponse.json({ error: bookingError.message }, { status: 500 });
    }

    const bkRef = `BK${String(bookingId).slice(-6).toUpperCase()}`;
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
