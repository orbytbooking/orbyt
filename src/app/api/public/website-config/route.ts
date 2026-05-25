import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/** Public read-only website builder JSON for a business (book-now, published site) — bypasses anon RLS. */
export async function GET(request: NextRequest) {
  const businessId = request.nextUrl.searchParams.get("business_id")?.trim() || "";
  if (!businessId || !UUID_RE.test(businessId)) {
    return NextResponse.json({ error: "Valid business_id query parameter required" }, { status: 400 });
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
  }

  try {
    const supabase = createClient(url, key, { auth: { persistSession: false } });
    const { data, error } = await supabase
      .from("business_website_configs")
      .select("config")
      .eq("business_id", businessId)
      .maybeSingle();

    if (error) {
      if (error.message?.includes("business_website_configs") && error.message?.includes("does not exist")) {
        return NextResponse.json({ config: null });
      }
      console.error("public/website-config GET:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ config: data?.config ?? null });
  } catch (e) {
    console.error("public/website-config GET:", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
