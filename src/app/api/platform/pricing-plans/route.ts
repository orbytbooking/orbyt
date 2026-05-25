import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const { data, error } = await supabase
      .from("platform_subscription_plans")
      .select("id, name, slug, amount_cents, billing_interval, is_active, pricing_features")
      .eq("is_active", true);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ plans: data ?? [] }, { status: 200 });
  } catch (e) {
    return NextResponse.json({ error: "Failed to load pricing plans" }, { status: 500 });
  }
}

