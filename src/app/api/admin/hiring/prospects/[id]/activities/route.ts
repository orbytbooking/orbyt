import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getAuthenticatedUser, createForbiddenResponse, createUnauthorizedResponse } from "@/lib/auth-helpers";

const getSupabaseAdmin = () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("Missing Supabase config");
  }
  return createClient(url, key, { auth: { persistSession: false } });
};

const getBusinessId = (request: NextRequest) =>
  request.headers.get("x-business-id") || request.nextUrl.searchParams.get("businessId");

async function ensureBusinessAccess(supabase: ReturnType<typeof getSupabaseAdmin>, businessId: string, userId: string) {
  const { data, error } = await supabase
    .from("businesses")
    .select("id, owner_id")
    .eq("id", businessId)
    .single();

  if (error || !data) {
    return { ok: false as const, response: NextResponse.json({ error: "Business not found" }, { status: 404 }) };
  }

  if ((data as { owner_id?: string }).owner_id !== userId) {
    return { ok: false as const, response: createForbiddenResponse("You do not own this business") };
  }

  return { ok: true as const };
}

type RouteCtx = { params: Promise<{ id: string }> };

/** Quiz completions linked to a prospect (for Activities timeline). */
export async function GET(request: NextRequest, ctx: RouteCtx) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) return createUnauthorizedResponse();

    const businessId = getBusinessId(request);
    if (!businessId) {
      return NextResponse.json({ error: "Business ID required" }, { status: 400 });
    }

    const { id: prospectId } = await ctx.params;
    if (!prospectId?.trim()) {
      return NextResponse.json({ error: "Prospect id required" }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();
    const access = await ensureBusinessAccess(supabase, businessId, user.id);
    if (!access.ok) return access.response;

    const { data: prospect, error: pErr } = await supabase
      .from("hiring_prospects")
      .select("id")
      .eq("id", prospectId)
      .eq("business_id", businessId)
      .maybeSingle();

    if (pErr) {
      return NextResponse.json({ error: pErr.message }, { status: 500 });
    }
    if (!prospect) {
      return NextResponse.json({ error: "Prospect not found" }, { status: 404 });
    }

    const { data: rows, error: sErr } = await supabase
      .from("hiring_form_submissions")
      .select("id, created_at, answers, form_id")
      .eq("prospect_id", prospectId)
      .eq("business_id", businessId)
      .order("created_at", { ascending: false });

    if (sErr) {
      return NextResponse.json({ error: sErr.message }, { status: 500 });
    }

    const submissions = rows ?? [];
    const formIds = [...new Set(submissions.map((r) => (r as { form_id: string }).form_id).filter(Boolean))];

    const quizNameByFormId = new Map<string, string>();
    if (formIds.length > 0) {
      const { data: formRows, error: fErr } = await supabase
        .from("hiring_forms")
        .select("id, name, form_kind")
        .in("id", formIds)
        .eq("business_id", businessId);

      if (fErr) {
        return NextResponse.json({ error: fErr.message }, { status: 500 });
      }

      for (const f of formRows ?? []) {
        const row = f as { id: string; name?: string; form_kind?: string };
        if (row.form_kind === "quiz") {
          quizNameByFormId.set(row.id, String(row.name ?? "Quiz"));
        }
      }
    }

    const items = submissions
      .filter((raw) => quizNameByFormId.has((raw as { form_id: string }).form_id))
      .map((raw) => {
        const r = raw as {
          id: string;
          created_at: string;
          answers: Record<string, unknown> | null;
          form_id: string;
        };
        const answers = (r.answers ?? {}) as Record<string, unknown>;
        const g = answers._grading as { scorePercent?: number | null } | undefined;
        const score =
          typeof g?.scorePercent === "number" && !Number.isNaN(g.scorePercent) ? `${g.scorePercent}%` : "—";
        return {
          submissionId: r.id,
          formName: quizNameByFormId.get(r.form_id) ?? "Quiz",
          createdAt: r.created_at,
          scoreLabel: score,
        };
      });

    return NextResponse.json({ items });
  } catch (e) {
    console.error("prospect activities GET error:", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
