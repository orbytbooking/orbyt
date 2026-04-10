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

export async function GET(request: NextRequest) {
  try {
    const ctx = await requireAdminTenantContext(request);
    if (ctx instanceof NextResponse) return ctx;
    const { supabase, businessId } = ctx;

    const hinted =
      request.headers.get("x-business-id")?.trim() ||
      request.nextUrl.searchParams.get("business_id")?.trim() ||
      null;
    const mismatch = assertBusinessIdMatchesContext(hinted, businessId);
    if (mismatch) return mismatch;

    const { data, error } = await supabase
      .from("orbyt_faqs")
      .select("id, question, answer, sort_order")
      .eq("business_id", businessId)
      .order("sort_order", { ascending: true });

    if (error) {
      if (error.message?.includes("orbyt_faqs") && error.message?.includes("does not exist")) {
        return NextResponse.json(
          {
            error: "FAQs table missing. Run database migration 101_orbyt_faqs.sql on your database.",
            code: "TABLE_MISSING",
          },
          { status: 500 }
        );
      }
      console.error("admin/faqs GET:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ faqs: (data || []).map(mapRow) });
  } catch (e) {
    console.error("admin/faqs GET:", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const ctx = await requireAdminTenantContext(request);
    if (ctx instanceof NextResponse) return ctx;
    const { supabase, businessId } = ctx;

    let body: { question?: string; answer?: string } = {};
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    const question = typeof body.question === "string" ? body.question.trim() : "";
    const answer = typeof body.answer === "string" ? body.answer.trim() : "";
    if (!question || !answer) {
      return NextResponse.json({ error: "question and answer are required" }, { status: 400 });
    }

    const hinted = request.headers.get("x-business-id")?.trim() || null;
    const mismatch = assertBusinessIdMatchesContext(hinted, businessId);
    if (mismatch) return mismatch;

    const { data: maxRow } = await supabase
      .from("orbyt_faqs")
      .select("sort_order")
      .eq("business_id", businessId)
      .order("sort_order", { ascending: false })
      .limit(1)
      .maybeSingle();

    const nextOrder =
      typeof maxRow?.sort_order === "number" && Number.isFinite(maxRow.sort_order)
        ? maxRow.sort_order + 1
        : 0;

    const now = new Date().toISOString();
    const { data, error } = await supabase
      .from("orbyt_faqs")
      .insert({
        business_id: businessId,
        question,
        answer,
        sort_order: nextOrder,
        created_at: now,
        updated_at: now,
      })
      .select("id, question, answer, sort_order")
      .single();

    if (error) {
      console.error("admin/faqs POST:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ faq: mapRow(data) });
  } catch (e) {
    console.error("admin/faqs POST:", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/** Reorder FAQs: body { orderedIds: string[] } — every FAQ id for this business, in order. */
export async function PUT(request: NextRequest) {
  try {
    const ctx = await requireAdminTenantContext(request);
    if (ctx instanceof NextResponse) return ctx;
    const { supabase, businessId } = ctx;

    let body: { orderedIds?: unknown } = {};
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    const hinted = request.headers.get("x-business-id")?.trim() || null;
    const mismatch = assertBusinessIdMatchesContext(hinted, businessId);
    if (mismatch) return mismatch;

    const orderedIds = Array.isArray(body.orderedIds)
      ? body.orderedIds.filter((id): id is string => typeof id === "string" && id.trim() !== "")
      : [];

    if (orderedIds.length === 0) {
      return NextResponse.json({ error: "orderedIds must be a non-empty array" }, { status: 400 });
    }
    if (new Set(orderedIds).size !== orderedIds.length) {
      return NextResponse.json({ error: "orderedIds must not contain duplicates" }, { status: 400 });
    }

    const { data: existing, error: listErr } = await supabase
      .from("orbyt_faqs")
      .select("id")
      .eq("business_id", businessId);

    if (listErr) {
      console.error("admin/faqs PUT list:", listErr);
      return NextResponse.json({ error: listErr.message }, { status: 500 });
    }

    const existingSet = new Set((existing || []).map((r: { id: string }) => r.id));
    if (existingSet.size !== orderedIds.length) {
      return NextResponse.json({ error: "orderedIds must include every FAQ for this business" }, { status: 400 });
    }
    for (const id of orderedIds) {
      if (!existingSet.has(id)) {
        return NextResponse.json({ error: "Invalid FAQ id in orderedIds" }, { status: 400 });
      }
    }

    const now = new Date().toISOString();
    for (let i = 0; i < orderedIds.length; i++) {
      const { error: upErr } = await supabase
        .from("orbyt_faqs")
        .update({ sort_order: i, updated_at: now })
        .eq("id", orderedIds[i])
        .eq("business_id", businessId);
      if (upErr) {
        console.error("admin/faqs PUT update:", upErr);
        return NextResponse.json({ error: upErr.message }, { status: 500 });
      }
    }

    const { data, error } = await supabase
      .from("orbyt_faqs")
      .select("id, question, answer, sort_order")
      .eq("business_id", businessId)
      .order("sort_order", { ascending: true });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ faqs: (data || []).map(mapRow) });
  } catch (e) {
    console.error("admin/faqs PUT:", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
