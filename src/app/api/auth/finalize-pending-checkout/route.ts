import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import Stripe from "stripe";
import { createServiceRoleClient } from "@/lib/auth-helpers";
import { processPendingOwnerCheckout } from "@/lib/webhooks/processPendingOwnerCheckout";

export const dynamic = "force-dynamic";

async function issueSessionTokensForEmail(admin: SupabaseClient, email: string): Promise<NextResponse> {
  const { data: linkData, error: linkError } = await admin.auth.admin.generateLink({
    type: "magiclink",
    email,
  });

  const props = linkData?.properties as { hashed_token?: string } | undefined;
  const hashedToken = props?.hashed_token;
  if (linkError || !hashedToken) {
    console.error("[finalize-pending-checkout] generateLink:", linkError);
    return NextResponse.json(
      {
        error: "Could not create login session",
        details: linkError?.message ?? "no_hashed_token",
        retryable: false,
      },
      { status: 500 }
    );
  }

  let otpRes = await admin.auth.verifyOtp({
    token_hash: hashedToken,
    type: "magiclink",
  });
  if (otpRes.error || !otpRes.data?.session) {
    otpRes = await admin.auth.verifyOtp({
      token_hash: hashedToken,
      type: "email",
    });
  }

  const sessionOut = otpRes.data?.session;

  if (otpRes.error || !sessionOut) {
    console.error("[finalize-pending-checkout] verifyOtp:", otpRes.error);
    return NextResponse.json(
      {
        error: "Could not verify session",
        details: otpRes.error?.message ?? "no_session",
        retryable: false,
      },
      { status: 500 }
    );
  }

  const { access_token, refresh_token } = sessionOut;
  return NextResponse.json({
    access_token,
    refresh_token,
  });
}

/**
 * After checkout redirects back: ensure pending owner is provisioned (Stripe path only), then return Supabase tokens.
 * Authorize.Net path: provisioning runs on /api/platform/billing/authorize-net/return; this route only exchanges session.
 */
export async function POST(request: Request) {
  const admin = createServiceRoleClient();
  if (!admin) {
    return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
  }

  let body: { stripeSessionId?: string; pendingOwnerId?: string; provider?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const pendingOwnerId = body.pendingOwnerId?.trim();
  if (pendingOwnerId && body.provider?.toLowerCase() === "authorize_net") {
    const { data: row, error } = await admin
      .from("pending_owner_onboarding")
      .select("email, consumed_at, auth_user_id")
      .eq("id", pendingOwnerId)
      .maybeSingle();

    if (error || !row) {
      return NextResponse.json({ error: "Pending onboarding not found", retryable: false }, { status: 404 });
    }

    if (!(row as { consumed_at?: string | null }).consumed_at) {
      return NextResponse.json(
        { error: "Account setup still in progress", retryable: true },
        { status: 400 }
      );
    }

    const email = (row as { email: string }).email?.trim().toLowerCase();
    if (!email) {
      return NextResponse.json({ error: "No email on pending row", retryable: false }, { status: 500 });
    }

    return issueSessionTokensForEmail(admin, email);
  }

  const stripeSecret = process.env.STRIPE_SECRET_KEY;
  if (!stripeSecret) {
    return NextResponse.json({ error: "STRIPE_SECRET_KEY is not configured" }, { status: 500 });
  }

  const stripeSessionId = body.stripeSessionId?.trim();
  if (!stripeSessionId) {
    return NextResponse.json({ error: "stripeSessionId is required" }, { status: 400 });
  }

  const stripe = new Stripe(stripeSecret);
  let session: Stripe.Checkout.Session;
  try {
    session = await stripe.checkout.sessions.retrieve(stripeSessionId, {
      expand: ["customer", "subscription"],
    });
  } catch {
    return NextResponse.json({ error: "Could not load Stripe session" }, { status: 400 });
  }

  const checkoutComplete =
    session.status === "complete" ||
    session.payment_status === "paid" ||
    session.payment_status === "no_payment_required";
  if (!checkoutComplete) {
    return NextResponse.json({ error: "Payment not completed yet" }, { status: 400 });
  }

  const result = await processPendingOwnerCheckout({
    supabase: admin,
    stripe,
    session,
  });

  if (!result.ok) {
    console.error("[finalize-pending-checkout]", result.error);
    return NextResponse.json(
      {
        error: "setup_failed",
        details: result.error,
        /** Repeating the request will not fix DB/auth issues; avoid hammering the API. */
        retryable: false,
      },
      { status: 500 }
    );
  }

  const email =
    result.email ||
    session.customer_details?.email?.trim() ||
    session.customer_email?.trim() ||
    undefined;

  if (!email) {
    return NextResponse.json(
      { error: "No email on checkout session", retryable: false },
      { status: 500 }
    );
  }

  return issueSessionTokensForEmail(admin, email);
}
