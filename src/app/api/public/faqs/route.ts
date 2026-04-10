import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/** Public read-only FAQs for a business (published website, previews). */
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
      .from("orbyt_faqs")
      .select("id, question, answer, sort_order")
      .eq("business_id", businessId)
      .order("sort_order", { ascending: true });

    if (error) {
      if (error.message?.includes("orbyt_faqs") && error.message?.includes("does not exist")) {
        return NextResponse.json({ faqs: [] });
      }
      console.error("public/faqs GET:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const faqs = (data || []).map((row, index) => ({
      id: row.id,
      question: row.question,
      answer: row.answer,
      order: typeof row.sort_order === "number" ? row.sort_order : index,
    }));

    return NextResponse.json({ faqs });
  } catch (e) {
    console.error("public/faqs GET:", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
