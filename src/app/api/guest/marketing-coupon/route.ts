import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseClient";

/**
 * Public read of an active marketing coupon for book-now / guest checkout.
 * Uses service role so validation works without admin session (RLS-safe).
 * Same row shape as AddBookingForm’s Supabase select.
 */
export async function GET(request: NextRequest) {
  if (!supabaseAdmin) {
    return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
  }

  const { searchParams } = new URL(request.url);
  const businessId = searchParams.get("business_id")?.trim();
  const code = searchParams.get("code")?.trim();
  if (!businessId || !code) {
    return NextResponse.json({ error: "business_id and code are required" }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from("marketing_coupons")
    .select("code, discount_type, discount_value, active, start_date, end_date, min_order, coupon_config")
    .eq("business_id", businessId)
    .ilike("code", code)
    .eq("active", true)
    .maybeSingle();

  if (error) {
    console.error("guest marketing-coupon:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  return NextResponse.json({ coupon: data });
}
