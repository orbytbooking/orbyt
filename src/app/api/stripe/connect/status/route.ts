import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import Stripe from "stripe";
import { getAuthenticatedUser, createUnauthorizedResponse, createForbiddenResponse } from "@/lib/auth-helpers";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) return createUnauthorizedResponse();

    const businessId =
      request.headers.get("x-business-id") ||
      request.nextUrl.searchParams.get("business");
    if (!businessId) {
      return NextResponse.json(
        { error: "Business ID required" },
        { status: 400 }
      );
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json(
        { error: "Server configuration error" },
        { status: 500 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const { data: business, error: bizError } = await supabase
      .from("businesses")
      .select("id, owner_id, stripe_connect_account_id")
      .eq("id", businessId)
      .single();

    if (bizError || !business) {
      return NextResponse.json({ error: "Business not found" }, { status: 404 });
    }
    if (business.owner_id !== user.id) {
      return createForbiddenResponse("You do not own this business");
    }

    const accountId = (business as { stripe_connect_account_id?: string })
      .stripe_connect_account_id;

    if (!accountId) {
      return NextResponse.json({
        connected: false,
        accountId: null,
        detailsSubmitted: false,
        chargesEnabled: false,
      });
    }

    if (!process.env.STRIPE_SECRET_KEY) {
      return NextResponse.json({
        connected: true,
        accountId,
        detailsSubmitted: false,
        chargesEnabled: false,
      });
    }

    const account = await stripe.accounts.retrieve(accountId);
    const detailsSubmitted = account.details_submitted ?? false;
    const chargesEnabled = account.charges_enabled ?? false;

    return NextResponse.json({
      connected: true,
      accountId,
      detailsSubmitted,
      chargesEnabled,
    });
  } catch (err) {
    console.error("Stripe Connect status error:", err);
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json(
      { error: "Failed to get Connect status", details: message },
      { status: 500 }
    );
  }
}
