import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseClient";
import { couponAllowsGiftCardsForBusiness, validateGiftCardForBusiness } from "@/lib/giftCardBooking";

/**
 * Public gift card validation for book-now / guest checkout.
 */
export async function GET(request: NextRequest) {
  if (!supabaseAdmin) {
    return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
  }

  const { searchParams } = new URL(request.url);
  const businessId = searchParams.get("business_id")?.trim();
  const uniqueCode = searchParams.get("unique_code")?.trim()?.toUpperCase();

  if (!businessId || !uniqueCode) {
    return NextResponse.json({ error: "business_id and unique_code are required" }, { status: 400 });
  }

  const couponCode = searchParams.get("coupon_code")?.trim();
  if (couponCode) {
    const couponCheck = await couponAllowsGiftCardsForBusiness(supabaseAdmin, businessId, couponCode);
    if (!couponCheck.allowed) {
      return NextResponse.json(
        { valid: false, error_message: couponCheck.message },
        { status: 400 },
      );
    }
  }

  const result = await validateGiftCardForBusiness(supabaseAdmin, businessId, uniqueCode);
  if (!result) {
    return NextResponse.json({ error: "Validation failed" }, { status: 500 });
  }

  return NextResponse.json({
    valid: result.valid,
    instance_id: result.instance_id,
    current_balance: result.current_balance,
    expires_at: result.expires_at,
    status: result.status,
    error_message: result.error_message,
  });
}
