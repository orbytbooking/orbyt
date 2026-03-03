import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getAuthenticatedUser, createUnauthorizedResponse, createForbiddenResponse } from "@/lib/auth-helpers";

export type PaymentProvider = "stripe" | "worldpay";

/** GET: Return payment provider and Worldpay settings for the business */
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) return createUnauthorizedResponse();

    const businessId =
      request.headers.get("x-business-id") || request.nextUrl.searchParams.get("business");
    if (!businessId) {
      return NextResponse.json({ error: "Business ID required" }, { status: 400 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const { data: business, error } = await supabase
      .from("businesses")
      .select("id, owner_id")
      .eq("id", businessId)
      .single();

    if (error || !business) {
      return NextResponse.json({ error: "Business not found" }, { status: 404 });
    }
    if ((business as { owner_id?: string }).owner_id !== user.id) {
      return createForbiddenResponse("You do not own this business");
    }

    let paymentProvider: PaymentProvider = "stripe";
    let worldpayMerchantId: string | null = null;
    const { data: settings, error: settingsError } = await supabase
      .from("businesses")
      .select("payment_provider, worldpay_merchant_id")
      .eq("id", businessId)
      .single();
    if (!settingsError && settings) {
      const b = settings as { payment_provider?: string; worldpay_merchant_id?: string | null };
      if (b.payment_provider === "worldpay") paymentProvider = "worldpay";
      if (b.worldpay_merchant_id != null) worldpayMerchantId = b.worldpay_merchant_id;
    }
    // When migration 056 not run, columns may be missing; default to Stripe
    return NextResponse.json({ paymentProvider, worldpayMerchantId });
  } catch (err) {
    console.error("Payment settings GET:", err);
    return NextResponse.json({ error: "Failed to load payment settings" }, { status: 500 });
  }
}

/** PATCH: Update payment provider and optional Worldpay merchant ID */
export async function PATCH(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) return createUnauthorizedResponse();

    const businessId = request.headers.get("x-business-id");
    if (!businessId) {
      return NextResponse.json({ error: "Business ID required" }, { status: 400 });
    }

    let body: { paymentProvider?: string; worldpayMerchantId?: string | null } = {};
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    const paymentProvider = body.paymentProvider;
    const worldpayMerchantId = body.worldpayMerchantId;

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const { data: business, error: fetchErr } = await supabase
      .from("businesses")
      .select("id, owner_id")
      .eq("id", businessId)
      .single();

    if (fetchErr || !business) {
      return NextResponse.json({ error: "Business not found" }, { status: 404 });
    }
    if ((business as { owner_id?: string }).owner_id !== user.id) {
      return createForbiddenResponse("You do not own this business");
    }

    const updates: { payment_provider?: string; worldpay_merchant_id?: string | null } = {};
    if (paymentProvider === "worldpay" || paymentProvider === "stripe") {
      updates.payment_provider = paymentProvider;
    }
    if (worldpayMerchantId !== undefined) {
      updates.worldpay_merchant_id =
        worldpayMerchantId === null || worldpayMerchantId === "" ? null : String(worldpayMerchantId).trim();
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: "No valid updates" }, { status: 400 });
    }

    const { error: updateErr } = await supabase
      .from("businesses")
      .update(updates)
      .eq("id", businessId);

    if (updateErr) {
      console.error("Payment settings PATCH:", updateErr);
      return NextResponse.json({ error: "Failed to update payment settings" }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      paymentProvider: updates.payment_provider ?? paymentProvider,
      worldpayMerchantId: updates.worldpay_merchant_id !== undefined ? updates.worldpay_merchant_id : worldpayMerchantId,
    });
  } catch (err) {
    console.error("Payment settings PATCH:", err);
    return NextResponse.json({ error: "Failed to update payment settings" }, { status: 500 });
  }
}
