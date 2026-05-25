import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getAuthenticatedUser, createUnauthorizedResponse, createForbiddenResponse } from "@/lib/auth-helpers";

export async function POST(request: Request) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) return createUnauthorizedResponse();

    const businessId =
      request.headers.get("x-business-id") ||
      (await request.json().catch(() => ({}))).businessId;
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

    const { error: updateError } = await supabase
      .from("businesses")
      .update({ stripe_connect_account_id: null })
      .eq("id", businessId);

    if (updateError) {
      console.error("Stripe Connect disconnect: failed to clear account id", updateError);
      return NextResponse.json(
        { error: "Failed to disconnect Stripe", details: updateError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, message: "Stripe disconnected" });
  } catch (err) {
    console.error("Stripe Connect disconnect error:", err);
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json(
      { error: "Failed to disconnect Stripe", details: message },
      { status: 500 }
    );
  }
}
