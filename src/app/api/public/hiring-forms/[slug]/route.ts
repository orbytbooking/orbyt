import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const getSupabaseAdmin = () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("Missing Supabase config");
  }
  return createClient(url, key, { auth: { persistSession: false } });
};

type RouteCtx = { params: Promise<{ slug: string }> };

/** Public: load a published hiring form definition by slug (for /apply/hiring/[slug]). */
export async function GET(_request: NextRequest, ctx: RouteCtx) {
  try {
    const { slug } = await ctx.params;
    const trimmed = slug?.trim();
    if (!trimmed) {
      return NextResponse.json({ error: "Invalid slug" }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("hiring_forms")
      .select("id, business_id, name, definition, published_slug")
      .eq("published_slug", trimmed)
      .eq("is_published", true)
      .maybeSingle();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    if (!data) {
      return NextResponse.json({ error: "Form not found" }, { status: 404 });
    }

    return NextResponse.json({
      formId: data.id,
      businessId: data.business_id,
      name: data.name,
      definition: data.definition,
    });
  } catch (error) {
    console.error("Public hiring form GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
