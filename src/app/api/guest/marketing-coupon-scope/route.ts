import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseClient";
import {
  couponUsesIdentityRules,
  evaluateMarketingCouponCustomerScope,
} from "@/lib/marketingCouponCustomerScope";

/**
 * Validates coupon limitations: new vs existing customer, single use per email.
 * Uses `bookings.customer_email` / `bookings.customer_id` + `customers.email` for the same business.
 */
export async function GET(request: NextRequest) {
  if (!supabaseAdmin) {
    return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
  }

  const { searchParams } = new URL(request.url);
  const businessId = searchParams.get("business_id")?.trim();
  const code = searchParams.get("code")?.trim();
  const email = searchParams.get("email")?.trim() ?? "";
  const enforceIdentity = searchParams.get("enforce_identity") === "true";

  if (!businessId || !code) {
    return NextResponse.json({ error: "business_id and code are required" }, { status: 400 });
  }

  const { data: coupon, error } = await supabaseAdmin
    .from("marketing_coupons")
    .select("code, coupon_config, usage_limit, active")
    .eq("business_id", businessId)
    .ilike("code", code)
    .eq("active", true)
    .maybeSingle();

  if (error) {
    console.error("marketing-coupon-scope:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!coupon) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  let authUserId: string | null = null;
  let authEmail: string | null = null;
  if (enforceIdentity && couponUsesIdentityRules(coupon.coupon_config)) {
    const authHeader = request.headers.get("authorization");
    const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7).trim() : "";
    if (!token) {
      return NextResponse.json({
        ok: false,
        title: "Sign in required",
        description: "Please sign in to use this coupon.",
      });
    }
    const { data: userData, error: userErr } = await supabaseAdmin.auth.getUser(token);
    if (userErr || !userData?.user) {
      return NextResponse.json({
        ok: false,
        title: "Sign in required",
        description: "Please sign in to use this coupon.",
      });
    }
    authUserId = userData.user.id;
    authEmail = userData.user.email ?? null;
  }

  const result = await evaluateMarketingCouponCustomerScope(supabaseAdmin, {
    businessId,
    couponCode: coupon.code || code,
    couponConfig: coupon.coupon_config,
    customerEmail: email || null,
    usageLimit: coupon.usage_limit ?? null,
    requireStrongIdentity: enforceIdentity,
    customerAuthUserId: authUserId,
    authenticatedEmail: authEmail,
  });

  if (!result.ok) {
    return NextResponse.json({
      ok: false,
      title: result.title,
      description: result.description,
    });
  }

  return NextResponse.json({ ok: true });
}
