import { NextRequest, NextResponse } from "next/server";
import {
  requireAdminTenantContext,
  assertBusinessIdMatchesContext,
} from "@/lib/adminTenantContext";
import { assertUserHasAdminModuleAccess } from "@/lib/bookingApiAuth";
import { shortBookingRefForLogs } from "@/lib/draftQuoteLogs";
import {
  buildBookingLogSnapshot,
  snapshotHasAnyData,
  type BookingLogMetadata,
} from "@/lib/bookingLogSnapshot";

type ActivityLogRow = {
  id: string;
  booking_id: string;
  created_at: string;
  activity_text: string;
  actor_name: string | null;
  event_key: string | null;
  metadata?: unknown;
};

function parseMetadata(raw: unknown): BookingLogMetadata | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const m = raw as Record<string, unknown>;
  return {
    current: (m.current as BookingLogMetadata["current"]) ?? null,
    previous: (m.previous as BookingLogMetadata["previous"]) ?? null,
    recurring_series_id:
      typeof m.recurring_series_id === "string" ? m.recurring_series_id : null,
  };
}

async function fetchActivityLogRow(
  supabase: ReturnType<typeof import("@supabase/supabase-js").createClient>,
  logId: string,
  bookingId: string,
  businessId: string
): Promise<{ row: ActivityLogRow | null; error: string | null }> {
  const baseQuery = () =>
    supabase
      .from("booking_quote_activity_logs")
      .select("id, booking_id, created_at, activity_text, actor_name, event_key")
      .eq("id", logId)
      .eq("booking_id", bookingId)
      .eq("business_id", businessId)
      .maybeSingle();

  const withMetaQuery = () =>
    supabase
      .from("booking_quote_activity_logs")
      .select("id, booking_id, created_at, activity_text, actor_name, event_key, metadata")
      .eq("id", logId)
      .eq("booking_id", bookingId)
      .eq("business_id", businessId)
      .maybeSingle();

  const metaRes = await withMetaQuery();
  if (!metaRes.error && metaRes.data) {
    return { row: metaRes.data as ActivityLogRow, error: null };
  }

  if (metaRes.error && /metadata|column|schema cache/i.test(metaRes.error.message)) {
    const baseRes = await baseQuery();
    if (baseRes.error) {
      return { row: null, error: baseRes.error.message };
    }
    return { row: (baseRes.data as ActivityLogRow | null) ?? null, error: null };
  }

  if (metaRes.error) {
    return { row: null, error: metaRes.error.message };
  }

  return { row: null, error: null };
}

async function resolveLogMetadata(
  supabase: ReturnType<typeof import("@supabase/supabase-js").createClient>,
  businessId: string,
  bookingId: string,
  parsed: BookingLogMetadata | null
): Promise<{ metadata: BookingLogMetadata | null; booking: Record<string, unknown> | null }> {
  const { data: bookingRow } = await supabase
    .from("bookings")
    .select("*")
    .eq("id", bookingId)
    .eq("business_id", businessId)
    .maybeSingle();

  if (!bookingRow) {
    return { metadata: parsed, booking: null };
  }

  const booking = bookingRow as Record<string, unknown>;
  const liveCurrent = await buildBookingLogSnapshot(supabase, booking);
  const liveSeriesId =
    typeof booking.recurring_series_id === "string" && booking.recurring_series_id.trim()
      ? booking.recurring_series_id
      : null;
  const seriesId = liveSeriesId ?? parsed?.recurring_series_id ?? null;

  if (!parsed || !snapshotHasAnyData(parsed.current)) {
    return {
      metadata: {
        current: liveCurrent,
        previous: parsed?.previous ?? null,
        recurring_series_id: seriesId,
      },
      booking,
    };
  }

  return {
    metadata: {
      current: parsed.current,
      previous: parsed.previous,
      recurring_series_id: seriesId ?? parsed.recurring_series_id,
    },
    booking,
  };
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; logId: string }> }
) {
  try {
    const { id: bookingId, logId } = await params;
    const ctx = await requireAdminTenantContext(request);
    if (ctx instanceof NextResponse) return ctx;
    const { supabase, businessId, user } = ctx;

    const hinted = request.headers.get("x-business-id")?.trim() || null;
    const mismatch = assertBusinessIdMatchesContext(hinted, businessId);
    if (mismatch) return mismatch;

    if (!bookingId || !logId || bookingId === "undefined" || logId === "undefined") {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    const access = await assertUserHasAdminModuleAccess(user.id, businessId, "bookings");
    if (access === "no_service_role") {
      return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
    }
    if (access === "denied") {
      return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
    }

    let { row: logRow, error: logErr } = await fetchActivityLogRow(
      supabase,
      logId,
      bookingId,
      businessId
    );

    if (!logRow) {
      const fallbackRes = await supabase
        .from("booking_quote_activity_logs")
        .select("id, booking_id, created_at, activity_text, actor_name, event_key")
        .eq("id", logId)
        .eq("business_id", businessId)
        .maybeSingle();

      if (!fallbackRes.error && fallbackRes.data) {
        logRow = fallbackRes.data as ActivityLogRow;
        logErr = null;
      }
    }

    if (logErr) {
      console.error("booking log detail query:", logErr);
      return NextResponse.json({ error: "Failed to load log entry" }, { status: 500 });
    }

    if (!logRow) {
      return NextResponse.json({ error: "Log entry not found" }, { status: 404 });
    }

    const resolvedBookingId = logRow.booking_id || bookingId;
    const parsed = parseMetadata(logRow.metadata);
    const { metadata } = await resolveLogMetadata(
      supabase,
      businessId,
      resolvedBookingId,
      parsed
    );
    const recurringSeriesId = metadata?.recurring_series_id ?? null;
    const isRecurring = Boolean(recurringSeriesId);
    const recurringBookingRefs =
      isRecurring && resolvedBookingId
        ? [
            {
              id: resolvedBookingId,
              ref: shortBookingRefForLogs(resolvedBookingId),
            },
          ]
        : [];

    return NextResponse.json({
      log: {
        id: logRow.id,
        booking_id: resolvedBookingId,
        created_at: logRow.created_at,
        activity_text: logRow.activity_text,
        actor_name: logRow.actor_name,
        event_key: logRow.event_key,
        metadata,
      },
      isRecurring,
      recurringBookingRefs,
    });
  } catch (e) {
    console.error("booking log detail GET:", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Internal server error" },
      { status: 500 }
    );
  }
}
