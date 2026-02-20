import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import { createAdminNotification } from '@/lib/adminProviderSync';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

/** Format DB time (e.g. "18:00:00" or "18:00") to display like "6:00 PM" */
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

/** Normalize display time (e.g. "6:00 PM") to DB time ("18:00:00") for PostgreSQL time columns */
function normalizeTimeForDb(timeStr: string): string | null {
  if (!timeStr || typeof timeStr !== 'string') return null;
  const trimmed = timeStr.trim();
  const amPm = trimmed.match(/(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(AM|PM)/i);
  if (amPm) {
    let h = parseInt(amPm[1], 10);
    const m = amPm[2] || '00';
    const s = amPm[3] || '00';
    if (amPm[4].toUpperCase() === 'PM' && h !== 12) h += 12;
    if (amPm[4].toUpperCase() === 'AM' && h === 12) h = 0;
    return `${String(h).padStart(2, '0')}:${m}:${s}`;
  }
  const already24 = trimmed.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
  if (already24) {
    const h = already24[1].padStart(2, '0');
    const m = already24[2] || '00';
    const s = (already24[3] || '00').padStart(2, '0');
    return `${h}:${m}:${s}`;
  }
  return trimmed || null;
}

/** Map DB booking row to customer portal Booking format. providerNameById is used when join didn't return provider (e.g. FK to different table). */
function dbToCustomerBooking(row: any, providerNameById?: Record<string, string>): {
  id: string;
  service: string;
  provider: string;
  frequency: string;
  date: string;
  time: string;
  status: 'scheduled' | 'completed' | 'canceled';
  address: string;
  contact: string;
  notes: string;
  price: number;
  tipAmount?: number;
  tipUpdatedAt?: string;
  customization?: Record<string, unknown>;
} {
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
  if (!providerName && row.provider_id && providerNameById?.[row.provider_id]) {
    providerName = providerNameById[row.provider_id];
  }
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

/** GET - Fetch bookings for the logged-in customer (customer portal) */
export async function GET(request: NextRequest) {
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

  const { data: customer, error: customerError } = await supabase
    .from('customers')
    .select('id')
    .eq('auth_user_id', user.id)
    .eq('business_id', businessId)
    .single();

  if (customerError || !customer) {
    return NextResponse.json({ bookings: [] });
  }

  let rows: any[] | null = null;
  let bookingsError: any = null;

  const withProviders = await supabase
    .from('bookings')
    .select('*, service_providers!provider_id(first_name, last_name)')
    .eq('customer_id', customer.id)
    .eq('business_id', businessId)
    .order('scheduled_date', { ascending: false });

  if (withProviders.error) {
    const fallback = await supabase
      .from('bookings')
      .select('*')
      .eq('customer_id', customer.id)
      .eq('business_id', businessId)
      .order('scheduled_date', { ascending: false });
    rows = fallback.data;
    bookingsError = fallback.error;
  } else {
    rows = withProviders.data;
  }

  if (bookingsError) {
    console.error('Customer bookings fetch error:', bookingsError);
    return NextResponse.json({ error: bookingsError.message }, { status: 500 });
  }

  const rawRows = rows ?? [];
  // When join fails or FK points elsewhere, provider_id is set but service_providers is null. Fetch names by id.
  const providerIdsNeedingName = rawRows.filter((r: any) => {
    if (!r?.provider_id) return false;
    const hasJoined = r.service_providers ?? r.providers;
    const hasDenorm = (r.provider_name ?? r.assigned_provider ?? '').trim();
    return !hasJoined && !hasDenorm;
  }).map((r: any) => r.provider_id);
  const uniqueProviderIds = [...new Set(providerIdsNeedingName)].filter(Boolean);

  let providerNameById: Record<string, string> = {};
  if (uniqueProviderIds.length > 0) {
    const { data: providers } = await supabase
      .from('service_providers')
      .select('id, first_name, last_name')
      .in('id', uniqueProviderIds);
    if (providers?.length) {
      for (const p of providers) {
        const name = [p.first_name, p.last_name].filter(Boolean).join(' ').trim();
        if (name && p.id) providerNameById[p.id] = name;
      }
    }
  }

  const bookings = rawRows.map((row: any) => dbToCustomerBooking(row, providerNameById));
  return NextResponse.json({ bookings });
}

/** POST - Create a booking as the logged-in customer (customer portal) */
export async function POST(request: NextRequest) {
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

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch (e) {
    console.error('Customer bookings POST parse error:', e);
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'Request body must be a JSON object' }, { status: 400 });
  }
  // Same pattern as admin: business from header first, then body
  const businessId =
    request.headers.get('x-business-id') ??
    body.businessId ??
    body.business_id ??
    request.nextUrl.searchParams.get('business');
  if (!businessId) {
    return NextResponse.json({ error: 'Business ID required' }, { status: 400 });
  }

  const { data: customer, error: customerError } = await supabase
    .from('customers')
    .select('id, name, email, phone')
    .eq('auth_user_id', user.id)
    .eq('business_id', businessId)
    .single();

  if (customerError || !customer) {
    return NextResponse.json({ error: 'Customer profile not found for this business' }, { status: 403 });
  }

  const date = body.date ?? '';
  let timeRaw = body.time ?? '';

  const parseNum = (v: unknown): number => {
    if (v == null) return 0;
    if (typeof v === 'number' && !Number.isNaN(v)) return v;
    const n = Number(v);
    return Number.isNaN(n) ? 0 : n;
  };
  const amountNum = parseNum(body.amount);
  const totalNum = parseNum(body.total);
  const subtotalNum = parseNum(body.subtotal);
  const priceNum = parseNum(body.price);
  const totalPrice =
    (amountNum > 0 ? amountNum : null) ??
    (totalNum > 0 ? totalNum : null) ??
    (subtotalNum > 0 ? subtotalNum : null) ??
    (priceNum > 0 ? priceNum : null) ??
    0;

  if (totalPrice === 0) {
    console.warn('[customer/bookings] Booking amount 0 – received:', {
      amount: body.amount,
      total: body.total,
      subtotal: body.subtotal,
      price: body.price,
      parsed: { amountNum, totalNum, subtotalNum, priceNum },
    });
  } else {
    console.log('[customer/bookings] Storing booking amount:', totalPrice);
  }

  const timeForDb = normalizeTimeForDb(String(timeRaw));
  const frequency = (body.frequency && String(body.frequency).trim()) || null;
  const providerId = body.provider_id ?? body.providerId ?? body.provider ?? null;
  const providerIdClean = providerId && String(providerId).trim() ? String(providerId).trim() : null;

  const notesVal = (body.notes ?? '').toString().trim();

  const insertMinimal: Record<string, unknown> = {
    business_id: businessId,
    customer_id: customer.id,
    customer_name: (customer.name ?? body.contact ?? '').toString().trim() || null,
    customer_email: (customer.email ?? '').toString().trim() || null,
    customer_phone: (customer.phone ?? body.contact ?? '').toString().trim() || null,
    provider_id: providerIdClean ?? null,
    service: (body.service ?? '').toString().trim() || null,
    address: (body.address ?? '').toString().trim() || '',
    notes: notesVal || null,
    frequency: frequency ?? null,
    total_price: totalPrice,
    amount: totalPrice,
    status: 'pending',
    scheduled_date: (date && String(date).trim()) ? String(date).trim() : null,
    scheduled_time: timeForDb ?? null,
    date: (date && String(date).trim()) ? String(date).trim() : null,
    time: timeForDb ?? null,
    payment_method: (body.paymentMethod === 'online' || body.payment_method === 'online') ? 'online' : 'cash',
    payment_status: 'pending',
    tip_amount: body.tipAmount ?? 0,
  };

  const insert: Record<string, unknown> = { ...insertMinimal };
  if (body.tipUpdatedAt) insert.tip_updated_at = body.tipUpdatedAt;
  const providerName = body.provider_name ?? body.providerName ?? null;
  if (providerName && String(providerName).trim()) insert.provider_name = String(providerName).trim();
  const customizationRaw = body.customization;
  if (customizationRaw && typeof customizationRaw === 'object' && !Array.isArray(customizationRaw)) {
    insert.customization = customizationRaw;
  }

  let booking: any = null;
  let insertError: any = null;

  const result = await supabase.from('bookings').insert(insert).select().single();
  booking = result.data;
  insertError = result.error;

  // If a column is missing (migrations not run), retry without only that column so we don't lose others
  if (insertError && /column|schema cache/i.test(String(insertError.message || ''))) {
    const msg = String(insertError.message || '').toLowerCase();
    const insertFallback = { ...insert };
    if (/customization/i.test(msg)) delete (insertFallback as any).customization;
    if (/frequency/i.test(msg)) delete insertFallback.frequency;
    if (/provider_name/i.test(msg)) delete (insertFallback as any).provider_name;
    const retry = await supabase.from('bookings').insert(insertFallback).select().single();
    booking = retry.data;
    insertError = retry.error;
  }
  if (insertError) {
    const retry = await supabase.from('bookings').insert(insertMinimal).select().single();
    booking = retry.data;
    insertError = retry.error;
  }

  if (insertError) {
    console.error('Customer booking create error:', insertError);
    return NextResponse.json(
      { error: insertError.message, details: insertError.details, hint: insertError.hint, code: insertError.code },
      { status: 500 }
    );
  }

  const bkRef = `BK${String(booking.id).slice(-6).toUpperCase()}`;
  await createAdminNotification(businessId, 'new_booking', {
    title: 'New booking confirmed',
    message: `Booking ${bkRef} has been confirmed.`,
    link: '/admin/bookings',
  });

  const payload = dbToCustomerBooking(booking);
  return NextResponse.json(
    { success: true, data: payload, message: 'Booking created successfully', id: booking.id },
    { status: 201 }
  );
}
