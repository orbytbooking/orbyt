import { NextRequest, NextResponse } from "next/server";
import { requireAdminTenantContext, assertBusinessIdMatchesContext } from "@/lib/adminTenantContext";
import { sendProviderSchedule, type ScheduleBookingRow } from "@/lib/sendProviderSchedule";

type ScheduleItemInput = {
  bookingId: string;
  occurrenceDate?: string;
  status?: string;
};

export async function POST(request: NextRequest) {
  try {
    const ctx = await requireAdminTenantContext(request);
    if (ctx instanceof NextResponse) return ctx;
    const { supabase, businessId } = ctx;

    let body: {
      startDate?: string;
      endDate?: string;
      bookingIds?: string[];
      scheduleItems?: ScheduleItemInput[];
      sendSms?: boolean;
      businessId?: string;
    } = {};
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const hinted =
      request.headers.get("x-business-id")?.trim() ||
      (typeof body.businessId === "string" ? body.businessId.trim() : "") ||
      null;
    const mismatch = assertBusinessIdMatchesContext(hinted, businessId);
    if (mismatch) return mismatch;

    const startDate = String(body.startDate ?? "").trim();
    const endDate = String(body.endDate ?? "").trim();

    const scheduleItems: ScheduleItemInput[] = Array.isArray(body.scheduleItems)
      ? body.scheduleItems
          .map((item) => ({
            bookingId: String(item.bookingId ?? "").trim(),
            occurrenceDate: item.occurrenceDate ? String(item.occurrenceDate).trim() : undefined,
            status: item.status ? String(item.status).trim() : undefined,
          }))
          .filter((item) => item.bookingId)
      : Array.isArray(body.bookingIds)
        ? body.bookingIds.map((id) => ({ bookingId: String(id).trim() })).filter((item) => item.bookingId)
        : [];

    if (!startDate || !endDate) {
      return NextResponse.json({ error: "startDate and endDate are required" }, { status: 400 });
    }
    if (scheduleItems.length === 0) {
      return NextResponse.json({ error: "At least one booking is required" }, { status: 400 });
    }

    const uniqueBookingIds = [...new Set(scheduleItems.map((item) => item.bookingId))];

    const { data: bookings, error: loadErr } = await supabase
      .from("bookings")
      .select(
        "id, business_id, provider_id, customer_name, customer_email, service, scheduled_date, date, scheduled_time, time, address, total_price, status, provider_name",
      )
      .eq("business_id", businessId)
      .in("id", uniqueBookingIds);

    if (loadErr) {
      console.error("[schedule/send] load bookings:", loadErr);
      return NextResponse.json({ error: "Failed to load bookings" }, { status: 500 });
    }

    const bookingById = new Map(
      (bookings ?? []).map((b) => [(b as { id: string }).id, b as Record<string, unknown>]),
    );

    const seenRowKeys = new Set<string>();
    const rows: ScheduleBookingRow[] = [];

    for (const item of scheduleItems) {
      const raw = bookingById.get(item.bookingId);
      if (!raw) continue;

      const visitDate =
        item.occurrenceDate ||
        String(raw.scheduled_date ?? raw.date ?? "").trim();
      const rowKey = `${item.bookingId}:${visitDate}`;
      if (seenRowKeys.has(rowKey)) continue;
      seenRowKeys.add(rowKey);

      const st = String(item.status ?? raw.status ?? "").toLowerCase();
      if (!["confirmed", "pending"].includes(st)) continue;
      if (!visitDate || visitDate < startDate || visitDate > endDate) continue;

      rows.push({
        id: item.bookingId,
        provider_id: (raw.provider_id as string | null) ?? null,
        customer_name: (raw.customer_name as string | null) ?? null,
        customer_email: (raw.customer_email as string | null) ?? null,
        service: (raw.service as string | null) ?? null,
        scheduled_date: visitDate,
        date: visitDate,
        scheduled_time: (raw.scheduled_time as string | null) ?? null,
        time: (raw.time as string | null) ?? null,
        address: (raw.address as string | null) ?? null,
        total_price: (raw.total_price as number | string | null) ?? null,
        status: st,
        provider_name: (raw.provider_name as string | null) ?? null,
      });
    }

    if (rows.length === 0) {
      return NextResponse.json(
        { error: "No eligible bookings found for the selected dates and status" },
        { status: 400 },
      );
    }

    const appBase = (process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin).replace(/\/$/, "");

    const result = await sendProviderSchedule(supabase, {
      businessId,
      startDate,
      endDate,
      bookings: rows,
      sendSms: body.sendSms === true,
      appBaseUrl: appBase,
    });

    if (result.emailsSent === 0 && result.providersNotified === 0) {
      const detail =
        result.skipped.length > 0
          ? result.skipped[0].reason
          : "No providers could be notified. Check assignments and template settings.";
      return NextResponse.json(
        {
          error: detail,
          skipped: result.skipped,
          warnings: result.warnings,
        },
        { status: 400 },
      );
    }

    return NextResponse.json({
      success: true,
      message: `Schedule sent to ${result.providersNotified} provider(s) (${result.emailsSent} email(s)${result.smsSent ? `, ${result.smsSent} SMS` : ""}).`,
      data: {
        startDate,
        endDate,
        providersNotified: result.providersNotified,
        emailsSent: result.emailsSent,
        smsSent: result.smsSent,
        bookingsUpdated: result.bookingsUpdated,
        skipped: result.skipped,
        warnings: result.warnings,
        sentAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error("[schedule/send]", error);
    const message = error instanceof Error ? error.message : "Internal server error";
    const status = message.includes("not configured") || message.includes("template named") ? 503 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function GET() {
  return NextResponse.json({ error: "Method not allowed" }, { status: 405 });
}
