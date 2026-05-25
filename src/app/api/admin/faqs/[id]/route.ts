import { NextRequest, NextResponse } from "next/server";
import {
  requireAdminTenantContext,
  assertBusinessIdMatchesContext,
} from "@/lib/adminTenantContext";

function mapRow(row: {
  id: string;
  question: string;
  answer: string;
  sort_order: number;
}) {
  return {
    id: row.id,
    question: row.question,
    answer: row.answer,
    order: row.sort_order,
  };
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await requireAdminTenantContext(request);
    if (ctx instanceof NextResponse) return ctx;
    const { supabase, businessId } = ctx;

    const { id: faqId } = await params;
    if (!faqId?.trim()) {
      return NextResponse.json({ error: "Missing FAQ id" }, { status: 400 });
    }

    const hinted = request.headers.get("x-business-id")?.trim() || null;
    const mismatch = assertBusinessIdMatchesContext(hinted, businessId);
    if (mismatch) return mismatch;

    let body: { question?: string; answer?: string } = {};
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    const updates: { question?: string; answer?: string; updated_at: string } = {
      updated_at: new Date().toISOString(),
    };
    if (typeof body.question === "string") {
      const q = body.question.trim();
      if (!q) return NextResponse.json({ error: "question cannot be empty" }, { status: 400 });
      updates.question = q;
    }
    if (typeof body.answer === "string") {
      const a = body.answer.trim();
      if (!a) return NextResponse.json({ error: "answer cannot be empty" }, { status: 400 });
      updates.answer = a;
    }
    if (Object.keys(updates).length === 1) {
      return NextResponse.json({ error: "No fields to update" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("orbyt_faqs")
      .update(updates)
      .eq("id", faqId.trim())
      .eq("business_id", businessId)
      .select("id, question, answer, sort_order")
      .maybeSingle();

    if (error) {
      console.error("admin/faqs PATCH:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    if (!data) {
      return NextResponse.json({ error: "FAQ not found" }, { status: 404 });
    }

    return NextResponse.json({ faq: mapRow(data) });
  } catch (e) {
    console.error("admin/faqs PATCH:", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await requireAdminTenantContext(request);
    if (ctx instanceof NextResponse) return ctx;
    const { supabase, businessId } = ctx;

    const { id: faqId } = await params;
    if (!faqId?.trim()) {
      return NextResponse.json({ error: "Missing FAQ id" }, { status: 400 });
    }

    const hinted = request.headers.get("x-business-id")?.trim() || null;
    const mismatch = assertBusinessIdMatchesContext(hinted, businessId);
    if (mismatch) return mismatch;

    const { data: existing } = await supabase
      .from("orbyt_faqs")
      .select("id")
      .eq("id", faqId.trim())
      .eq("business_id", businessId)
      .maybeSingle();

    if (!existing) {
      return NextResponse.json({ error: "FAQ not found" }, { status: 404 });
    }

    const { error } = await supabase
      .from("orbyt_faqs")
      .delete()
      .eq("id", faqId.trim())
      .eq("business_id", businessId);

    if (error) {
      console.error("admin/faqs DELETE:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("admin/faqs DELETE:", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
