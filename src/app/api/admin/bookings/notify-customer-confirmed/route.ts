import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import {
  getAuthenticatedUser,
  createUnauthorizedResponse,
  createForbiddenResponse,
} from "@/lib/auth-helpers";
import { userCanManageBookingsForBusiness } from "@/lib/bookingApiAuth";
import {
  sendCustomerBookingConfirmedEmail,
  type BookingRowForCustomerConfirmedEmail,
} from "@/lib/sendCustomerBookingConfirmedEmail";

const BOOKING_SELECT =
  "id, business_id, status, customer_email, customer_name, service, scheduled_date, date, scheduled_time, time, address, total_price, exclude_customer_notification, provider_id, provider_name";

/**
 * POST: Send booking-confirmed email to the customer (after admin confirms or assigns from UI).
 * Body: { bookingId: string }
 * Headers: x-business-id (required)
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) return createUnauthorizedResponse();
    const role = user.user_metadata?.role || "owner";
    if (role === "customer") return createForbiddenResponse("Customers cannot access admin endpoints");

    const businessId = request.headers.get("x-business-id")?.trim();
    if (!businessId) {
      return NextResponse.json({ error: "x-business-id header required" }, { status: 400 });
    }

    const body = await request.json().catch(() => ({}));
    const bookingId = body?.bookingId ?? request.nextUrl.searchParams.get("bookingId");
    if (!bookingId || typeof bookingId !== "string") {
      return NextResponse.json({ error: "bookingId required" }, { status: 400 });
    }

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } }
    );

    const allowed = await userCanManageBookingsForBusiness(supabaseAdmin, user.id, businessId);
    if (!allowed) {
      return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
    }

    const { data: booking, error } = await supabaseAdmin
      .from("bookings")
      .select(BOOKING_SELECT)
      .eq("id", bookingId)
      .eq("business_id", businessId)
      .maybeSingle();

    if (error || !booking) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    if (String(booking.status || "") !== "confirmed") {
      return NextResponse.json({ success: true, skipped: true, reason: "not_confirmed" });
    }

    await sendCustomerBookingConfirmedEmail(
      supabaseAdmin,
      businessId,
      booking as BookingRowForCustomerConfirmedEmail
    );
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("Notify customer confirmed email error:", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
