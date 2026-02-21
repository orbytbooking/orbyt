import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import { createAdminNotification } from '@/lib/adminProviderSync';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

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

/** POST - Create a booking without authentication (guest checkout) */
export async function POST(request: NextRequest) {
  if (!supabaseUrl || !supabaseServiceKey) {
    return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch (e) {
    console.error('Guest bookings POST parse error:', e);
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'Request body must be a JSON object' }, { status: 400 });
  }

  const businessId =
    request.headers.get('x-business-id') ??
    body.businessId ??
    body.business_id ??
    request.nextUrl.searchParams.get('business');
  if (!businessId) {
    return NextResponse.json({ error: 'Business ID required' }, { status: 400 });
  }

  const customerName = (body.customer_name ?? body.customerName ?? '').toString().trim();
  const customerEmail = (body.customer_email ?? body.customerEmail ?? '').toString().trim();
  const customerPhone = (body.customer_phone ?? body.customerPhone ?? body.contact ?? '').toString().trim();
  if (!customerName || !customerEmail) {
    return NextResponse.json({ error: 'Customer name and email are required' }, { status: 400 });
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

  const timeForDb = normalizeTimeForDb(String(timeRaw));
  const frequency = (body.frequency && String(body.frequency).trim()) || null;
  const providerId = body.provider_id ?? body.providerId ?? body.provider ?? null;
  const providerIdClean = providerId && String(providerId).trim() ? String(providerId).trim() : null;
  const providerName = body.provider_name ?? body.providerName ?? null;

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  // Link to existing customer when email matches (manual customers get same treatment as portal customers)
  let customerId: string | null = null;
  if (customerEmail) {
    const { data: existing } = await supabase
      .from('customers')
      .select('id')
      .eq('business_id', businessId)
      .ilike('email', customerEmail)
      .maybeSingle();
    if (existing?.id) customerId = existing.id;
  }

  const customizationRaw = body.customization;
  const insert: Record<string, unknown> = {
    business_id: businessId,
    customer_id: customerId,
    customer_name: customerName || null,
    customer_email: customerEmail || null,
    customer_phone: customerPhone || null,
    provider_id: providerIdClean ?? null,
    service: (body.service ?? '').toString().trim() || null,
    address: (body.address ?? '').toString().trim() || '',
    notes: (body.notes ?? '').toString().trim() || null,
    frequency: frequency ?? null,
    total_price: totalPrice,
    amount: totalPrice,
    status: 'pending',
    scheduled_date: date || null,
    scheduled_time: timeForDb || null,
    date: date || null,
    time: timeForDb || null,
    payment_method: (body.paymentMethod === 'online' || body.payment_method === 'online') ? 'online' : 'cash',
    payment_status: 'pending',
    tip_amount: body.tipAmount ?? 0,
  };
  if (body.tipUpdatedAt) insert.tip_updated_at = body.tipUpdatedAt;
  if (providerName && String(providerName).trim()) insert.provider_name = String(providerName).trim();
  if (customizationRaw && typeof customizationRaw === 'object' && !Array.isArray(customizationRaw)) {
    insert.customization = customizationRaw;
  }

  let booking: any = null;
  let error: any = null;
  const result = await supabase.from('bookings').insert(insert).select().single();
  booking = result.data;
  error = result.error;

  // If a column is missing, retry without only that column so we don't lose frequency/customization
  if (error && /column|schema cache/i.test(String(error.message || ''))) {
    const msg = String(error.message || '').toLowerCase();
    const insertFallback = { ...insert };
    if (/customization/i.test(msg)) delete insertFallback.customization;
    if (/frequency/i.test(msg)) delete insertFallback.frequency;
    if (/provider_name/i.test(msg)) delete insertFallback.provider_name;
    const retry = await supabase.from('bookings').insert(insertFallback).select().single();
    booking = retry.data;
    error = retry.error;
  }

  if (error) {
    console.error('Guest booking create error:', error);
    return NextResponse.json(
      { error: error.message, details: error.details, hint: error.hint, code: error.code },
      { status: 500 }
    );
  }

  const bkRef = `BK${String(booking.id).slice(-6).toUpperCase()}`;
  await createAdminNotification(businessId, 'new_booking', {
    title: 'New booking confirmed',
    message: `Booking ${bkRef} has been confirmed.`,
    link: '/admin/bookings',
  });

  return NextResponse.json(
    {
      success: true,
      data: {
        id: booking.id,
        service: booking.service,
        status: booking.status,
        date: booking.date ?? booking.scheduled_date,
        time: booking.time ?? booking.scheduled_time,
        address: booking.address,
        amount: totalPrice,
      },
      message: 'Booking created successfully. Sign in later to see it in your dashboard.',
      id: booking.id,
    },
    { status: 201 }
  );
}
