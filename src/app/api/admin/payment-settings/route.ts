import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getAuthenticatedUser, createUnauthorizedResponse, createForbiddenResponse } from "@/lib/auth-helpers";

export type PaymentProvider = "stripe" | "authorize_net";

/** GET: Return payment provider and Authorize.net settings for the business */
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
    let stripeConnected = false;
    let stripePublishableKeyMasked: string | null = null;
    let stripe3dsEnabled = true;
    let stripeBillingAddressEnabled = false;
    let authorizeNetApiLoginId: string | null = null;
    const { data: settings, error: settingsError } = await supabase
      .from("businesses")
      .select("payment_provider, authorize_net_api_login_id, stripe_connect_account_id, stripe_publishable_key, stripe_secret_key, stripe_3ds_enabled, stripe_billing_address_enabled")
      .eq("id", businessId)
      .single();
    if (!settingsError && settings) {
      const b = settings as {
        payment_provider?: string;
        authorize_net_api_login_id?: string | null;
        stripe_connect_account_id?: string | null;
        stripe_publishable_key?: string | null;
        stripe_secret_key?: string | null;
        stripe_3ds_enabled?: boolean | null;
        stripe_billing_address_enabled?: boolean | null;
      };
      if (b.payment_provider === "authorize_net") paymentProvider = "authorize_net";
      if (b.authorize_net_api_login_id != null) authorizeNetApiLoginId = b.authorize_net_api_login_id;
      const hasConnect = !!(b.stripe_connect_account_id != null && String(b.stripe_connect_account_id).trim() !== "");
      const hasKeys = !!(b.stripe_secret_key != null && String(b.stripe_secret_key).trim() !== "");
      stripeConnected = hasConnect || hasKeys;
      if (b.stripe_publishable_key) {
        const pk = String(b.stripe_publishable_key).trim();
        stripePublishableKeyMasked = pk.length > 12 ? `${pk.slice(0, 12)}...` : "•••";
      }
      if (b.stripe_3ds_enabled !== undefined && b.stripe_3ds_enabled !== null) stripe3dsEnabled = !!b.stripe_3ds_enabled;
      if (b.stripe_billing_address_enabled !== undefined && b.stripe_billing_address_enabled !== null) stripeBillingAddressEnabled = !!b.stripe_billing_address_enabled;
    }
    return NextResponse.json({
      paymentProvider,
      authorizeNetApiLoginId,
      stripeConnected,
      stripePublishableKeyMasked,
      stripe3dsEnabled,
      stripeBillingAddressEnabled,
    });
  } catch (err) {
    console.error("Payment settings GET:", err);
    return NextResponse.json({ error: "Failed to load payment settings" }, { status: 500 });
  }
}

/** PATCH: Update payment provider and Authorize.net credentials */
export async function PATCH(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) return createUnauthorizedResponse();

    const businessId = request.headers.get("x-business-id");
    if (!businessId) {
      return NextResponse.json({ error: "Business ID required" }, { status: 400 });
    }

    let body: {
      paymentProvider?: string;
      authorizeNetApiLoginId?: string | null;
      authorizeNetTransactionKey?: string | null;
      stripePublishableKey?: string | null;
      stripeSecretKey?: string | null;
      stripe3dsEnabled?: boolean;
      stripeBillingAddressEnabled?: boolean;
    } = {};
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    const paymentProvider = body.paymentProvider;
    const authorizeNetApiLoginId = body.authorizeNetApiLoginId;
    const authorizeNetTransactionKey = body.authorizeNetTransactionKey;
    const stripePublishableKey = body.stripePublishableKey;
    const stripeSecretKey = body.stripeSecretKey;
    const stripe3dsEnabled = body.stripe3dsEnabled;
    const stripeBillingAddressEnabled = body.stripeBillingAddressEnabled;

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

    const updates: {
      payment_provider?: string;
      authorize_net_api_login_id?: string | null;
      authorize_net_transaction_key?: string | null;
      stripe_publishable_key?: string | null;
      stripe_secret_key?: string | null;
      stripe_3ds_enabled?: boolean;
      stripe_billing_address_enabled?: boolean;
    } = {};
    if (paymentProvider === "stripe" || paymentProvider === "authorize_net") {
      updates.payment_provider = paymentProvider;
    }
    if (authorizeNetApiLoginId !== undefined) {
      updates.authorize_net_api_login_id =
        authorizeNetApiLoginId === null || authorizeNetApiLoginId === "" ? null : String(authorizeNetApiLoginId).trim();
    }
    if (authorizeNetTransactionKey !== undefined) {
      updates.authorize_net_transaction_key =
        authorizeNetTransactionKey === null || authorizeNetTransactionKey === ""
          ? null
          : String(authorizeNetTransactionKey).trim();
    }
    if (stripePublishableKey !== undefined) {
      updates.stripe_publishable_key =
        stripePublishableKey === null || stripePublishableKey === "" ? null : String(stripePublishableKey).trim();
    }
    if (stripeSecretKey !== undefined) {
      updates.stripe_secret_key =
        stripeSecretKey === null || stripeSecretKey === "" ? null : String(stripeSecretKey).trim();
    }
    if (stripe3dsEnabled !== undefined) {
      updates.stripe_3ds_enabled = !!stripe3dsEnabled;
    }
    if (stripeBillingAddressEnabled !== undefined) {
      updates.stripe_billing_address_enabled = !!stripeBillingAddressEnabled;
    }
    if (stripePublishableKey !== undefined || stripeSecretKey !== undefined) {
      updates.payment_provider = "stripe";
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
      authorizeNetApiLoginId: updates.authorize_net_api_login_id !== undefined ? updates.authorize_net_api_login_id : authorizeNetApiLoginId,
    });
  } catch (err) {
    console.error("Payment settings PATCH:", err);
    return NextResponse.json({ error: "Failed to update payment settings" }, { status: 500 });
  }
}
