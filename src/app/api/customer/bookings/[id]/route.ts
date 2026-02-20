import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import { createAdminNotification } from '@/lib/adminProviderSync';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

function formatTimeForDisplay(timeStr: string): string {
  if (!timeStr || typeof timeStr !== 'string') return timeStr;
  const trimmed = timeStr.trim();
  const match = trimmed.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?/);
  if (!match) return trimmed;
  const hours = parseInt(match[1], 10);
  const minutes = match[2] || '00';
  const ampm = hours >= 12 ? 'PM' : 'AM';
  const h = hours % 12 || 12;
  return `${h}:${minutes} ${ampm}`;
}

function dbToCustomerBooking(row: any): Record<string, unknown> {
  const statusMap: Record<string, string> = {
    pending: 'scheduled',
    confirmed: 'confirmed',
    in_progress: 'in_progress',
    completed: 'completed',
    cancelled: 'canceled',
  };
  const date = row.date ?? row.scheduled_date ?? '';
  const rawTime = row.time ?? row.scheduled_time ?? '';
  const time = formatTimeForDisplay(String(rawTime));
  const totalPrice = Number(row.total_price);
  const amount = Number(row.amount);
  const price = (totalPrice && !Number.isNaN(totalPrice)) ? totalPrice : ((amount && !Number.isNaN(amount)) ? amount : 0);
  const providerRow = row.service_providers ?? row.providers;
  let providerName = providerRow
    ? [providerRow.first_name, providerRow.last_name].filter(Boolean).join(' ').trim()
    : (row.provider_name ?? row.assigned_provider ?? '').trim();
  return {
    id: row.id,
    service: row.service ?? '',
    provider: providerName || 'Unassigned',
    frequency: row.frequency && String(row.frequency).trim() ? String(row.frequency).trim() : '',
    date,
    time,
    status: statusMap[row.status] ?? (row.status ?? 'scheduled'),
    address: row.address ?? '',
    contact: row.customer_phone ?? row.customer_email ?? '',
    notes: row.notes ?? '',
    price,
    tipAmount: row.tip_amount != null ? Number(row.tip_amount) : undefined,
    tipUpdatedAt: row.tip_updated_at ?? undefined,
    customization: row.customization != null && typeof row.customization === 'object' ? row.customization : undefined,
  };
}

/** GET - Fetch a single booking for the logged-in customer (e.g. for rebook prefill) */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!supabaseUrl || !supabaseServiceKey) {
    return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
  }

  const authHeader = request.headers.get('Authorization');
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const businessId = request.nextUrl.searchParams.get('business');
  if (!businessId) {
    return NextResponse.json({ error: 'Business ID required' }, { status: 400 });
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  const { data: { user }, error: authError } = await supabase.auth.getUser(token);
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id: bookingId } = await params;
  if (!bookingId) {
    return NextResponse.json({ error: 'Booking ID required' }, { status: 400 });
  }

  const { data: customer, error: customerError } = await supabase
    .from('customers')
    .select('id')
    .eq('auth_user_id', user.id)
    .eq('business_id', businessId)
    .single();

  if (customerError || !customer) {
    return NextResponse.json({ error: 'Customer profile not found for this business' }, { status: 403 });
  }

  const { data: row, error } = await supabase
    .from('bookings')
    .select(`
      id, business_id, customer_id, provider_id, service_id, service, status,
      scheduled_date, scheduled_time, date, time, address, apt_no, zip_code,
      notes, total_price, amount, payment_method, payment_status, tip_amount, tip_updated_at,
      customer_name, customer_email, customer_phone, customization, frequency, provider_name,
      service_providers ( first_name, last_name )
    `)
    .eq('id', bookingId)
    .eq('customer_id', customer.id)
    .eq('business_id', businessId)
    .single();

  if (error || !row) {
    return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
  }

  // If join didn't return provider but provider_id is set, fetch name from service_providers
  let rowForMapping = row;
  const needsProviderName = row.provider_id && !(row.service_providers ?? row.providers) && !(row.provider_name ?? row.assigned_provider ?? '').trim();
  if (needsProviderName) {
    const { data: prov } = await supabase
      .from('service_providers')
      .select('first_name, last_name')
      .eq('id', row.provider_id)
      .single();
    if (prov) {
      const name = [prov.first_name, prov.last_name].filter(Boolean).join(' ').trim();
      if (name) rowForMapping = { ...row, provider_name: name };
    }
  }

  return NextResponse.json({ booking: dbToCustomerBooking(rowForMapping) });
}

/** PATCH - Cancel (or update) a booking as the logged-in customer */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!supabaseUrl || !supabaseServiceKey) {
    return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
  }

  const authHeader = request.headers.get('Authorization');
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  const { data: { user }, error: authError } = await supabase.auth.getUser(token);
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id: bookingId } = await params;
  if (!bookingId) {
    return NextResponse.json({ error: 'Booking ID required' }, { status: 400 });
  }

  const { data: customer, error: customerError } = await supabase
    .from('customers')
    .select('id')
    .eq('auth_user_id', user.id)
    .single();

  if (customerError || !customer) {
    return NextResponse.json({ error: 'Customer profile not found' }, { status: 403 });
  }

  const { data: booking, error: fetchError } = await supabase
    .from('bookings')
    .select('id, customer_id, business_id')
    .eq('id', bookingId)
    .single();

  if (fetchError || !booking) {
    return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
  }

  if (booking.customer_id !== customer.id) {
    return NextResponse.json({ error: 'You can only cancel your own bookings' }, { status: 403 });
  }

  const body = await request.json().catch(() => ({}));
  const status = body.status === 'canceled' || body.status === 'cancelled' ? 'cancelled' : body.status;

  const updates: Record<string, unknown> = {};
  if (status) updates.status = status;

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'No updates provided' }, { status: 400 });
  }

  const { data: updated, error: updateError } = await supabase
    .from('bookings')
    .update(updates)
    .eq('id', bookingId)
    .select()
    .single();

  if (updateError) {
    console.error('Customer cancel booking error:', updateError);
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  if (status === 'cancelled' && booking.business_id) {
    const bkRef = `BK${String(bookingId).slice(-6).toUpperCase()}`;
    await createAdminNotification(booking.business_id, 'cancellation_request', {
      title: 'Cancellation request',
      message: `Customer requested to cancel ${bkRef}.`,
      link: '/admin/bookings',
    });
  }

  return NextResponse.json({ booking: updated });
}
