import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import { createAdminNotification } from '@/lib/adminProviderSync';
import { processBookingScheduling } from '@/lib/bookingScheduling';
import { EmailService } from '@/lib/emailService';
import { getStoreOptionsScheduling, isDateHoliday, getSpotLimits, getBookingCountForDate, getBookingCountForWeek, isTimeSlotAvailableForBooking } from '@/lib/schedulingFilters';

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

  const date = (body.date ?? '').toString().trim();
  let timeRaw = body.time ?? '';

  // Holiday and spot limits checks (guest = customer for blocking)
  if (date) {
    const storeOpts = await getStoreOptionsScheduling(businessId);
    const holidayBlocked = storeOpts?.holiday_blocked_who === 'customer' || storeOpts?.holiday_blocked_who === 'both';
    if (holidayBlocked) {
      const isHoliday = await isDateHoliday(businessId, date);
      if (isHoliday) {
        return NextResponse.json(
          { error: 'HOLIDAY_BLOCKED', message: 'Booking is not available on this date (holiday).' },
          { status: 400 }
        );
      }
    }
    if (storeOpts?.spot_limits_enabled) {
      const limits = await getSpotLimits(businessId);
      if (limits?.enabled) {
        const supabaseForCount = createClient(supabaseUrl, supabaseServiceKey);
        const dayCount = await getBookingCountForDate(supabaseForCount, businessId, date);
        if (limits.max_bookings_per_day > 0 && dayCount >= limits.max_bookings_per_day) {
          return NextResponse.json(
            { error: 'DAY_CAPACITY', message: 'This date has reached maximum bookings.' },
            { status: 400 }
          );
        }
        const weekStart = new Date(date);
        weekStart.setDate(weekStart.getDate() - weekStart.getDay());
        const weekStartStr = weekStart.toISOString().split('T')[0];
        const weekCount = await getBookingCountForWeek(supabaseForCount, businessId, weekStartStr);
        if (limits.max_bookings_per_week > 0 && weekCount >= limits.max_bookings_per_week) {
          return NextResponse.json(
            { error: 'WEEK_CAPACITY', message: 'This week has reached maximum bookings.' },
            { status: 400 }
          );
        }
      }
    }
  }

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
      .select('id, booking_blocked')
      .eq('business_id', businessId)
      .ilike('email', customerEmail)
      .maybeSingle();
    if (existing?.id) {
      if (existing.booking_blocked) {
        const { data: accessRow } = await supabase
          .from('business_access_settings')
          .select('customer_blocked_message')
          .eq('business_id', businessId)
          .maybeSingle();
        const message =
          accessRow?.customer_blocked_message ||
          'We apologize for the inconvenience. Please contact our office if you have any questions.';
        return NextResponse.json(
          { error: 'BOOKING_BLOCKED', message },
          { status: 403 }
        );
      }
      customerId = existing.id;
    }
  }

  const customizationRaw = body.customization;

  // Parse duration_minutes from body (for max_minutes validation)
  let durationMinutes = 0;
  if (body.duration_minutes != null && typeof body.duration_minutes === 'number' && body.duration_minutes > 0) {
    durationMinutes = Math.round(body.duration_minutes);
  } else if (body.duration != null) {
    const dv = parseFloat(String(body.duration));
    const unit = (body.duration_unit || 'Hours').toString();
    if (!isNaN(dv) && dv > 0) {
      durationMinutes = unit.toLowerCase().includes('hour') ? Math.round(dv * 60) : Math.round(dv);
    }
  }
  if (durationMinutes > 0) {
    const storeOptsForDuration = await getStoreOptionsScheduling(businessId);
    const maxMins = storeOptsForDuration?.max_minutes_per_provider_per_booking;
    if (maxMins != null && maxMins > 0 && durationMinutes > maxMins) {
      return NextResponse.json(
        { error: 'DURATION_EXCEEDED', message: `Booking duration (${durationMinutes} min) exceeds maximum allowed (${maxMins} min).` },
        { status: 400 }
      );
    }
  }

  // Booking Koala-style: per-time-spot capacity (Reserve Slot settings)
  if (date && timeForDb) {
    const slotAvailable = await isTimeSlotAvailableForBooking(supabase, businessId, date, timeForDb);
    if (!slotAvailable) {
      return NextResponse.json(
        { error: 'SLOT_FULL', message: 'This time slot is full. Please choose another time.' },
        { status: 400 }
      );
    }
  }

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
  if (durationMinutes > 0) insert.duration_minutes = durationMinutes;

  const createRecurring = body.create_recurring === true || body.create_recurring === 'true';
  const scheduledDate = date || null;
  const timeForRecurring = timeForDb || '09:00:00';

  if (createRecurring && frequency && scheduledDate) {
    const freqName = String(frequency).trim();
    let frequencyRepeats: string | null = (body.frequency_repeats && String(body.frequency_repeats).trim()) || null;
    if (!frequencyRepeats) {
      const { data: biz } = await supabase.from('businesses').select('industry_id').eq('id', businessId).single();
      const industryId = (biz as { industry_id?: string } | null)?.industry_id;
      if (industryId) {
        const { data: freq } = await supabase
          .from('industry_frequency')
          .select('frequency_repeats')
          .eq('industry_id', industryId)
          .ilike('name', freqName)
          .maybeSingle();
        frequencyRepeats = (freq as { frequency_repeats?: string } | null)?.frequency_repeats ?? null;
      }
    }
    const endDate = (body.recurring_end_date && String(body.recurring_end_date).trim()) || null;
    const occurrencesAhead = Math.min(Math.max(1, parseInt(String(body.recurring_occurrences_ahead || 8), 10) || 8), 24);

    try {
      const { createRecurringSeries } = await import('@/lib/recurringBookings');
      const template = { ...insert, scheduled_time: timeForRecurring, time: timeForRecurring };
      const { seriesId, bookingIds } = await createRecurringSeries(supabase, businessId, template, {
        startDate: scheduledDate,
        endDate: endDate || undefined,
        frequencyName: freqName,
        frequencyRepeats,
        occurrencesAhead,
        sameProvider: true,
      });
      const { data: firstBooking } = await supabase.from('bookings').select('*').eq('id', bookingIds[0]).single();
      const bkRef = `BK${String(bookingIds[0]).slice(-6).toUpperCase()}`;
      await createAdminNotification(businessId, 'new_booking', {
        title: 'Recurring booking (guest)',
        message: `Recurring booking ${bkRef} created with ${bookingIds.length} occurrences.`,
        link: '/admin/bookings',
      });
      await processBookingScheduling(firstBooking?.id, businessId, {
        providerId: firstBooking?.provider_id,
        scheduledDate: firstBooking?.scheduled_date ?? firstBooking?.date,
        service: firstBooking?.service,
      }).catch((e) => console.warn('Scheduling processing failed:', e));
      return NextResponse.json(
        { success: true, data: firstBooking, message: `Recurring booking created with ${bookingIds.length} visits`, id: bookingIds[0], seriesId, bookingIds },
        { status: 201 }
      );
    } catch (e: unknown) {
      console.error('Guest recurring series error:', e);
      return NextResponse.json(
        { error: e instanceof Error ? e.message : 'Failed to create recurring booking' },
        { status: 500 }
      );
    }
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

  await processBookingScheduling(booking.id, businessId, {
    providerId: booking.provider_id,
    scheduledDate: booking.scheduled_date ?? booking.date,
    service: booking.service,
  }).catch((e) => console.warn('Scheduling processing failed:', e));

  const bkRef = `BK${String(booking.id).slice(-6).toUpperCase()}`;
  await createAdminNotification(businessId, 'new_booking', {
    title: 'New booking confirmed',
    message: `Booking ${bkRef} has been confirmed.`,
    link: '/admin/bookings',
  });

  if (customerEmail) {
    try {
      const { data: biz } = await supabase.from('businesses').select('name').eq('id', businessId).single();
      const emailService = new EmailService();
      await emailService.sendBookingConfirmation({
        to: customerEmail,
        customerName: customerName || 'Customer',
        businessName: biz?.name || 'Your Business',
        service: booking.service,
        scheduledDate: booking.scheduled_date ?? booking.date,
        scheduledTime: booking.scheduled_time ?? booking.time,
        address: booking.address,
        totalPrice: totalPrice,
        bookingRef: bkRef,
      });
    } catch (e) {
      console.warn('Booking confirmation email failed:', e);
    }
  }

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
