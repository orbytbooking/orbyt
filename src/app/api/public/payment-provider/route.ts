import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

/**
 * GET ?business=uuid
 * Returns the payment provider for the given business (stripe | authorize_net).
 * Public endpoint for book-now page to show correct payment method label.
 */
export async function GET(request: NextRequest) {
  try {
    const businessId = request.nextUrl.searchParams.get("business");
    if (!businessId) {
      return NextResponse.json({ provider: "stripe" }, { status: 200 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json({ provider: "stripe" }, { status: 200 });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    const { data, error } = await supabase
      .from("businesses")
      .select("payment_provider")
      .eq("id", businessId)
      .single();

    if (error || !data) {
      return NextResponse.json({ provider: "stripe" }, { status: 200 });
    }

    const p = (data as { payment_provider?: string }).payment_provider;
    const provider = p === "authorize_net" ? "authorize_net" : "stripe";
    return NextResponse.json({ provider });
  } catch {
    return NextResponse.json({ provider: "stripe" }, { status: 200 });
  }
}
