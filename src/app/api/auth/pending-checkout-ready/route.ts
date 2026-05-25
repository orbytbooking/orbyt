import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createServiceRoleClient } from "@/lib/auth-helpers";
import { PLATFORM_PENDING_OWNER_KIND } from "@/lib/platform-billing/stripePlatformSubscription";

export const dynamic = "force-dynamic";

/**
 * Poll whether checkout.session.completed processing finished (pending row consumed).
 * Query: ?stripe_session_id=cs_...
 */
export async function GET(request: Request) {
  const secret = process.env.STRIPE_SECRET_KEY;
  if (!secret) {
    return NextResponse.json({ error: "STRIPE_SECRET_KEY is not configured" }, { status: 500 });
  }

  const admin = createServiceRoleClient();
  if (!admin) {
    return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
  }

  const { searchParams } = new URL(request.url);
  const sessionId = searchParams.get("stripe_session_id")?.trim();
  if (!sessionId) {
    return NextResponse.json({ error: "stripe_session_id is required" }, { status: 400 });
  }

  const stripe = new Stripe(secret);
  let session: Stripe.Checkout.Session;
  try {
    session = await stripe.checkout.sessions.retrieve(sessionId);
  } catch {
    return NextResponse.json({ error: "Invalid session" }, { status: 400 });
  }

  const checkoutComplete =
    session.status === "complete" ||
    session.payment_status === "paid" ||
    session.payment_status === "no_payment_required";
  if (!checkoutComplete) {
    return NextResponse.json({ ready: false, reason: "payment_not_complete" });
  }

  if (session.metadata?.kind !== PLATFORM_PENDING_OWNER_KIND) {
    return NextResponse.json({ ready: false, reason: "not_pending_owner_checkout" });
  }

  const pendingId = session.metadata?.pending_id?.trim();
  if (!pendingId) {
    return NextResponse.json({ ready: false, reason: "missing_pending_id" });
  }

  const { data: row } = await admin
    .from("pending_owner_onboarding")
    .select("consumed_at, email")
    .eq("id", pendingId)
    .maybeSingle();

  if (!row) {
    return NextResponse.json({ ready: false, reason: "pending_not_found" });
  }

  const consumed = (row as { consumed_at?: string | null }).consumed_at;
  if (!consumed) {
    return NextResponse.json({ ready: false, reason: "processing" });
  }

  return NextResponse.json({
    ready: true,
    email: (row as { email: string }).email,
  });
}
