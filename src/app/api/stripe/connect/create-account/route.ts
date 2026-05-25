import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import Stripe from "stripe";
import { getAuthenticatedUser, createUnauthorizedResponse, createForbiddenResponse } from "@/lib/auth-helpers";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function POST(request: Request) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) return createUnauthorizedResponse();

    let body: { businessId?: string } = {};
    try {
      body = await request.json();
    } catch {
      // no body
    }
    const businessId =
      request.headers.get("x-business-id") || body.businessId;
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
      .select("id, owner_id, business_email, name, stripe_connect_account_id")
      .eq("id", businessId)
      .single();

    if (bizError || !business) {
      const errMsg = bizError?.message ?? "";
      if (errMsg.includes("stripe_connect_account_id") || (errMsg.includes("column") && errMsg.includes("does not exist"))) {
        return NextResponse.json(
          { error: "Database migration required. Run database/migrations/020_add_stripe_connect_to_businesses.sql on your database.", details: errMsg },
          { status: 500 }
        );
      }
      return NextResponse.json({ error: "Business not found" }, { status: 404 });
    }
    if (business.owner_id !== user.id) {
      return createForbiddenResponse("You do not own this business");
    }

    if (!process.env.STRIPE_SECRET_KEY) {
      return NextResponse.json(
        { error: "Stripe is not configured. Add STRIPE_SECRET_KEY to your .env." },
        { status: 500 }
      );
    }

    let accountId = business.stripe_connect_account_id ?? null;

    if (!accountId) {
      const account = await stripe.accounts.create({
        type: "express",
        country: "US",
        email: (business.business_email || user.email) ?? undefined,
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true },
        },
        business_type: "individual",
      });
      accountId = account.id;
      const { error: updateError } = await supabase
        .from("businesses")
        .update({ stripe_connect_account_id: accountId })
        .eq("id", businessId);

      if (updateError) {
        console.error("Stripe Connect: failed to save account id to business", updateError);
        if (updateError.message?.includes("column") && updateError.message?.includes("does not exist")) {
          return NextResponse.json(
            { error: "Database migration required. Run migrations/020_add_stripe_connect_to_businesses.sql on your database.", details: updateError.message },
            { status: 500 }
          );
        }
        return NextResponse.json(
          { error: "Failed to save Stripe account to business", details: updateError.message },
          { status: 500 }
        );
      }
    }

    const origin = process.env.NEXT_PUBLIC_APP_URL || request.headers.get("origin") || "";
    const returnUrl = `${origin}/admin/settings/account?tab=billing&stripe=return`;
    const refreshUrl = `${origin}/admin/settings/account?tab=billing&stripe=refresh`;

    const accountLink = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: refreshUrl,
      return_url: returnUrl,
      type: "account_onboarding",
    });

    return NextResponse.json({ url: accountLink.url, accountId });
  } catch (err) {
    console.error("Stripe Connect create-account error:", err);
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json(
      { error: "Failed to create Stripe Connect link", details: message },
      { status: 500 }
    );
  }
}
