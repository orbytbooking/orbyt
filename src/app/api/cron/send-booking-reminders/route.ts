/**
 * Sends time-based booking reminder emails (provider one day / one hour, admin job reminders, etc.)
 * when the matching notification template is enabled for the business.
 *
 * Schedule every 10–15 minutes via Vercel Cron or cron-job.org.
 * Production: CRON_SECRET required; pass Authorization: Bearer <CRON_SECRET>.
 */
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { processBookingReminderEmails } from "@/lib/sendBookingReminderEmails";

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Missing Supabase config");
  return createClient(url, key, { auth: { persistSession: false } });
}

export async function GET(request: NextRequest) {
  return handleRequest(request);
}

export async function POST(request: NextRequest) {
  return handleRequest(request);
}

async function handleRequest(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;
    const isProduction = process.env.NODE_ENV === "production";

    if (isProduction && !cronSecret) {
      console.error("[send-booking-reminders] CRON_SECRET is not set in production");
      return NextResponse.json(
        { error: "Cron endpoint misconfigured: CRON_SECRET required in production" },
        { status: 500 },
      );
    }

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const appBaseUrl =
      process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ||
      request.nextUrl.origin.replace(/\/$/, "");

    const supabase = getSupabase();
    const result = await processBookingReminderEmails(supabase, { appBaseUrl });

    return NextResponse.json({
      ok: true,
      emailsSent: result.emailsSent,
      bookingsChecked: result.bookingsChecked,
      skippedCount: result.skipped.length,
      warnings: result.warnings,
    });
  } catch (e) {
    console.error("[send-booking-reminders]", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Internal error" },
      { status: 500 },
    );
  }
}
