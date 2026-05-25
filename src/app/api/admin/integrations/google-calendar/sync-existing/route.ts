import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getAuthenticatedUser, createUnauthorizedResponse, createForbiddenResponse } from "@/lib/auth-helpers";
import { createCalendarEvent, createRecurringCalendarEvent, updateCalendarEvent, updateRecurringCalendarEvent, deleteCalendarEvent, type RecurringSeriesForCalendar } from "@/lib/googleCalendar";

/**
 * POST: Sync system calendar → Google Calendar (one-way).
 * Fetches all non-cancelled bookings from the system and creates or updates
 * the corresponding events in Google Calendar so Google mirrors the system calendar.
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) return createUnauthorizedResponse();

    const businessId = request.headers.get("x-business-id") || (await request.json().catch(() => ({}))).businessId || request.nextUrl.searchParams.get("business");
    if (!businessId) {
      return NextResponse.json({ error: "Business ID required" }, { status: 400 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const { data: business, error: bizError } = await supabase
      .from("businesses")
      .select("id, owner_id")
      .eq("id", businessId)
      .single();

    if (bizError || !business) {
      return NextResponse.json({ error: "Business not found" }, { status: 404 });
    }
    if ((business as { owner_id?: string }).owner_id !== user.id) {
      return createForbiddenResponse("You do not own this business");
    }

    // Fetch all non-cancelled bookings (paginate to avoid default 1000 limit)
    const pageSize = 1000;
    let allBookings: Record<string, unknown>[] = [];
    let page = 0;
    let hasMore = true;
    while (hasMore) {
      const { data: pageData, error: pageErr } = await supabase
        .from("bookings")
        .select("id, business_id, scheduled_date, scheduled_time, date, time, service, address, notes, customer_name, duration_minutes, google_calendar_event_id, recurring_series_id, created_at")
        .eq("business_id", businessId)
        .neq("status", "cancelled")
        .order("scheduled_date", { ascending: true, nullsFirst: false })
        .range(page * pageSize, (page + 1) * pageSize - 1);
      if (pageErr) {
        console.error("[googleCalendar] sync-existing fetch bookings:", pageErr);
        return NextResponse.json({ error: "Failed to load bookings" }, { status: 500 });
      }
      const list = pageData || [];
      allBookings = allBookings.concat(list);
      hasMore = list.length === pageSize;
      page++;
    }

    // Sync entire system calendar: every non-cancelled booking → create or update in Google
    type BookingRow = { id: string; scheduled_date?: string | null; date?: string | null; scheduled_time?: string | null; time?: string | null; service?: string | null; address?: string | null; notes?: string | null; customer_name?: string | null; duration_minutes?: number | null; created_at?: string | null; recurring_series_id?: string | null; google_calendar_event_id?: string | null };
    const toSync = allBookings as BookingRow[];

    let synced = 0;
    let failed = 0;
    let skippedNoDate = 0;
    const seriesProcessed = new Set<string>();

    for (const booking of toSync) {
      const seriesId = booking.recurring_series_id;
      if (seriesId && seriesProcessed.has(seriesId)) continue;

      const hasDate = (booking.scheduled_date ?? booking.date ?? "").toString().trim().length >= 10;
      if (!hasDate && booking.created_at) {
        const created = (booking.created_at as string).slice(0, 10);
        if (created.length >= 10) {
          (booking as Record<string, unknown>).scheduled_date = created;
          (booking as Record<string, unknown>).date = created;
          if (!booking.scheduled_time && !booking.time) (booking as Record<string, unknown>).scheduled_time = "09:00:00";
        }
      }
      if (!hasDate && !(booking.created_at && String(booking.created_at).slice(0, 10).length >= 10)) {
        skippedNoDate++;
        continue;
      }

      if (seriesId) {
        const { data: series } = await supabase
          .from("recurring_series")
          .select("start_date, end_date, frequency, frequency_repeats, occurrences_ahead")
          .eq("id", seriesId)
          .single();
        if (series) {
          seriesProcessed.add(seriesId);
          const existingEventId = booking.google_calendar_event_id && String(booking.google_calendar_event_id).trim() ? booking.google_calendar_event_id : null;
          if (existingEventId) {
            const ok = await updateRecurringCalendarEvent(businessId, existingEventId, booking, series as RecurringSeriesForCalendar).catch(() => false);
            if (ok) synced++;
            else failed++;
          } else {
            const eventId = await createRecurringCalendarEvent(businessId, booking, series as RecurringSeriesForCalendar).catch(() => null);
            if (eventId) {
              const { error: updateErr } = await supabase
                .from("bookings")
                .update({ google_calendar_event_id: eventId })
                .eq("recurring_series_id", seriesId)
                .eq("business_id", businessId);
              if (updateErr) failed++;
              else synced++;
            } else {
              failed++;
            }
          }
          continue;
        }
      }

      const existingEventId = booking.google_calendar_event_id && String(booking.google_calendar_event_id).trim() ? booking.google_calendar_event_id : null;
      if (existingEventId) {
        const ok = await updateCalendarEvent(businessId, existingEventId, booking).catch(() => false);
        if (ok) synced++;
        else failed++;
      } else {
        const eventId = await createCalendarEvent(businessId, booking).catch(() => null);
        if (eventId && booking.id) {
          const { error: updateErr } = await supabase
            .from("bookings")
            .update({ google_calendar_event_id: eventId })
            .eq("id", booking.id)
            .eq("business_id", businessId);
          if (updateErr) failed++;
          else synced++;
        } else {
          failed++;
        }
      }
    }

    return NextResponse.json({ synced, failed, skippedNoDate, total: toSync.length });
  } catch (err) {
    console.error("[googleCalendar] sync-existing:", err);
    return NextResponse.json({ error: "Sync failed" }, { status: 500 });
  }
}
