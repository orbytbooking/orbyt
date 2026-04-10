import { NextRequest, NextResponse } from 'next/server';
import {
  requireAdminTenantContext,
  assertBusinessIdMatchesContext,
} from '@/lib/adminTenantContext';
import {
  extendAllRecurringSeries,
  getOccurrenceDatesForSeriesSync,
  statusForRecurringOccurrence,
} from '@/lib/recurringBookings';

const BOOKING_SELECT =
  'id, service, scheduled_date, scheduled_time, date, time, total_price, customer_name, customer_email, customer_phone, address, apt_no, zip_code, notes, status, provider_id, provider_name, payment_method, payment_status, frequency, customization, provider_wage, provider_wage_type, duration_minutes, cancellation_fee_amount, cancellation_fee_currency, private_booking_notes, private_customer_notes, service_provider_notes, card_brand, card_last4, recurring_series_id, completed_occurrence_dates, customer_cancelled_occurrence_dates';

/** GET — bookings for one provider, with recurring series expanded (admin provider profile calendar). */
export async function GET(request: NextRequest) {
  try {
    const ctx = await requireAdminTenantContext(request);
    if (ctx instanceof NextResponse) return ctx;
    const { supabase, businessId } = ctx;

    const { searchParams } = new URL(request.url);
    const hinted =
      request.headers.get('x-business-id')?.trim() ||
      searchParams.get('businessId')?.trim() ||
      null;
    const mismatch = assertBusinessIdMatchesContext(hinted, businessId);
    if (mismatch) return mismatch;

    const providerId = searchParams.get('provider_id');
    if (!providerId) {
      return NextResponse.json({ error: 'provider_id is required' }, { status: 400 });
    }

    try {
      await extendAllRecurringSeries(supabase, businessId);
    } catch (e) {
      console.warn('[provider-bookings] extendAllRecurringSeries', e);
    }

    const { data: rows, error } = await supabase
      .from('bookings')
      .select(BOOKING_SELECT)
      .eq('business_id', businessId)
      .eq('provider_id', providerId)
      .order('scheduled_date', { ascending: false })
      .order('scheduled_time', { ascending: false })
      .limit(300);

    if (error) {
      console.error('Provider bookings error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const merged = [...(rows ?? [])];
    merged.sort((a: any, b: any) => {
      const da = a.scheduled_date || a.date || '';
      const db = b.scheduled_date || b.date || '';
      if (da !== db) return db.localeCompare(da);
      return (b.scheduled_time || b.time || '').localeCompare(a.scheduled_time || a.time || '');
    });

    const needProviderName = merged.filter((b: any) => b.provider_id && !b.provider_name);
    const providerIds = [...new Set(needProviderName.map((b: any) => b.provider_id))];
    let providerNamesById: Record<string, string> = {};
    if (providerIds.length > 0) {
      const { data: providers } = await supabase
        .from('service_providers')
        .select('id, first_name, last_name')
        .in('id', providerIds);
      if (providers) {
        for (const p of providers) {
          const name = `${(p.first_name || '').trim()} ${(p.last_name || '').trim()}`.trim();
          if (name) providerNamesById[p.id] = name;
        }
      }
    }
    const withProviders = merged.map((b: any) =>
      b.provider_name ? b : { ...b, provider_name: providerNamesById[b.provider_id] || null },
    );
    const top = withProviders.slice(0, 200);

    const recurringIds = [...new Set(top.filter((b: any) => b.recurring_series_id).map((b: any) => b.recurring_series_id))];
    let expanded: any[] = top;
    if (recurringIds.length > 0) {
      const { data: seriesList } = await supabase
        .from('recurring_series')
        .select('id, start_date, end_date, frequency, frequency_repeats, occurrences_ahead, scheduled_time, duration_minutes')
        .eq('business_id', businessId)
        .in('id', recurringIds);
      const seriesById = (seriesList || []).reduce((acc: Record<string, any>, s: any) => {
        acc[s.id] = s;
        return acc;
      }, {});
      const out: any[] = [];
      for (const booking of top) {
        if (booking.recurring_series_id && seriesById[booking.recurring_series_id]) {
          const series = seriesById[booking.recurring_series_id];
          const dates = getOccurrenceDatesForSeriesSync(series);
          const time = series.scheduled_time || booking.scheduled_time || booking.time;
          const durationFromRow =
            booking.duration_minutes != null ? Number(booking.duration_minutes) : null;
          const mergedDuration =
            durationFromRow != null && Number.isFinite(durationFromRow) && durationFromRow > 0
              ? durationFromRow
              : series.duration_minutes != null &&
                  Number.isFinite(Number(series.duration_minutes)) &&
                  Number(series.duration_minutes) > 0
                ? Number(series.duration_minutes)
                : null;
          if (!dates.length) {
            out.push({
              ...booking,
              ...(mergedDuration != null ? { duration_minutes: mergedDuration } : {}),
            });
            continue;
          }
          for (const d of dates) {
            const occurrenceStatus = statusForRecurringOccurrence(d, booking);
            out.push({
              ...booking,
              date: d,
              scheduled_date: d,
              scheduled_time: time,
              time,
              status: occurrenceStatus,
              ...(mergedDuration != null ? { duration_minutes: mergedDuration } : {}),
            });
          }
        } else {
          out.push(booking);
        }
      }
      const seenKeys = new Set<string>();
      expanded = out.filter((b: any) => {
        const key = `${b.id}-${String(b.date ?? b.scheduled_date ?? '').slice(0, 10)}`;
        if (seenKeys.has(key)) return false;
        seenKeys.add(key);
        return true;
      });
    }

    expanded.sort((a: any, b: any) => {
      const da = a.scheduled_date || a.date || '';
      const db = b.scheduled_date || b.date || '';
      if (da !== db) return db.localeCompare(da);
      return String(b.scheduled_time || b.time || '').localeCompare(String(a.scheduled_time || a.time || ''));
    });

    return NextResponse.json({ bookings: expanded });
  } catch (e) {
    console.error('Provider bookings API error:', e);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
