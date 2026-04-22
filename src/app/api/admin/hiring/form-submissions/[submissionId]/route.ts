import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getAuthenticatedUser, createForbiddenResponse, createUnauthorizedResponse } from "@/lib/auth-helpers";
import {
  buildGradedQuizReviewRows,
  buildQuizSummaryQuestions,
  normalizeGradingStats,
  prospectSnapshotFromAnswers,
} from "@/lib/hiring-quiz-summary-display";
import {
  applyManualGradingOverrides,
  computeHiringFormGrading,
  parseManualGradingFromAnswers,
  type HiringFormGradingSummary,
  type ManualGradeOverride,
} from "@/lib/hiring-form-grading";

function parseGrading(raw: unknown): HiringFormGradingSummary | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  if ((raw as { version?: unknown }).version !== 2) return undefined;
  return raw as HiringFormGradingSummary;
}

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

type RouteCtx = { params: Promise<{ submissionId: string }> };

export async function GET(request: NextRequest, ctx: RouteCtx) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) return createUnauthorizedResponse();

    const businessId = getBusinessId(request);
    if (!businessId) {
      return NextResponse.json({ error: "Business ID required" }, { status: 400 });
    }

    const { submissionId } = await ctx.params;
    if (!submissionId?.trim()) {
      return NextResponse.json({ error: "Submission id required" }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();
    const access = await ensureBusinessAccess(supabase, businessId, user.id);
    if (!access.ok) return access.response;

    const { data: row, error } = await supabase
      .from("hiring_form_submissions")
      .select("id, created_at, answers, prospect_id, form_id, business_id")
      .eq("id", submissionId)
      .eq("business_id", businessId)
      .maybeSingle();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    if (!row) {
      return NextResponse.json({ error: "Submission not found" }, { status: 404 });
    }

    const formId = (row as { form_id: string }).form_id;
    const { data: formRow, error: formErr } = await supabase
      .from("hiring_forms")
      .select("id, name, form_kind, definition")
      .eq("id", formId)
      .eq("business_id", businessId)
      .maybeSingle();

    if (formErr || !formRow) {
      return NextResponse.json({ error: "Form not found" }, { status: 404 });
    }

    const definition = ((formRow as { definition?: { formFields?: unknown[] } }).definition ?? {}) as {
      formFields?: unknown[];
    };
    const formFields = definition.formFields ?? [];
    const answers = ((row as { answers?: Record<string, unknown> }).answers ?? {}) as Record<string, unknown>;
    const manualGrading = parseManualGradingFromAnswers(answers._manualGrading);
    const grading = parseGrading(answers._grading);
    const cleanAnswers = { ...answers };
    delete cleanAnswers._grading;
    delete cleanAnswers._manualGrading;

    let prospect = prospectSnapshotFromAnswers(formFields, cleanAnswers);
    const prospectId = (row as { prospect_id?: string | null }).prospect_id;
    if (prospectId) {
      const { data: pRow } = await supabase
        .from("hiring_prospects")
        .select("first_name, last_name, email, phone")
        .eq("id", prospectId)
        .eq("business_id", businessId)
        .maybeSingle();
      if (pRow) {
        const pr = pRow as {
          first_name: string;
          last_name: string | null;
          email: string;
          phone: string | null;
        };
        prospect = {
          firstName: (pr.first_name ?? "").trim(),
          lastName: (pr.last_name ?? "").trim(),
          email: (pr.email ?? "").trim(),
          phone: (pr.phone ?? "").trim(),
        };
      }
    }

    const questions = buildQuizSummaryQuestions(formFields, cleanAnswers, grading);
    const gradedRows = buildGradedQuizReviewRows(formFields, cleanAnswers, grading);
    const stats = normalizeGradingStats(grading);

    return NextResponse.json({
      submissionId: (row as { id: string }).id,
      formId,
      formName: String((formRow as { name?: string }).name ?? "Quiz"),
      formKind: (formRow as { form_kind?: string }).form_kind ?? "prospect",
      submittedAt: (row as { created_at: string }).created_at,
      prospectId: prospectId ?? null,
      prospect,
      stats,
      questions,
      gradedRows,
      manualGrading,
    });
  } catch (e) {
    console.error("form-submissions GET error:", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

function normalizeManualPayload(
  raw: unknown
): Partial<Record<string, ManualGradeOverride>> | null {
  if (raw == null) return {};
  if (typeof raw !== "object") return null;
  const out: Partial<Record<string, ManualGradeOverride>> = {};
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    if (!k.trim()) continue;
    if (v === "correct" || v === "incorrect" || v === "skip") {
      out[k] = v;
    }
    if (v === "" || v === null || v === "select") {
      /* omit — use auto */
    }
  }
  return out;
}

export async function PATCH(request: NextRequest, ctx: RouteCtx) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) return createUnauthorizedResponse();

    const businessId = getBusinessId(request);
    if (!businessId) {
      return NextResponse.json({ error: "Business ID required" }, { status: 400 });
    }

    const { submissionId } = await ctx.params;
    if (!submissionId?.trim()) {
      return NextResponse.json({ error: "Submission id required" }, { status: 400 });
    }

    const body = await request.json().catch(() => ({}));
    const manual = normalizeManualPayload(body.manualGrading);
    if (manual === null) {
      return NextResponse.json({ error: "Invalid manualGrading payload" }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();
    const access = await ensureBusinessAccess(supabase, businessId, user.id);
    if (!access.ok) return access.response;

    const { data: row, error } = await supabase
      .from("hiring_form_submissions")
      .select("id, answers, form_id, business_id")
      .eq("id", submissionId)
      .eq("business_id", businessId)
      .maybeSingle();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    if (!row) {
      return NextResponse.json({ error: "Submission not found" }, { status: 404 });
    }

    const formId = (row as { form_id: string }).form_id;
    const { data: formRow, error: formErr } = await supabase
      .from("hiring_forms")
      .select("id, definition, form_kind")
      .eq("id", formId)
      .eq("business_id", businessId)
      .maybeSingle();

    if (formErr || !formRow) {
      return NextResponse.json({ error: "Form not found" }, { status: 404 });
    }

    if ((formRow as { form_kind?: string }).form_kind !== "quiz") {
      return NextResponse.json({ error: "Only quiz submissions can be manually graded here" }, { status: 400 });
    }

    const definition = ((formRow as { definition?: { formFields?: unknown[] } }).definition ?? {}) as {
      formFields?: unknown[];
    };
    const formFields = definition.formFields ?? [];
    const answers = ((row as { answers?: Record<string, unknown> }).answers ?? {}) as Record<string, unknown>;
    const cleanAnswers = { ...answers };
    delete cleanAnswers._grading;
    delete cleanAnswers._manualGrading;

    const auto = computeHiringFormGrading(formFields, cleanAnswers);
    if (!auto) {
      return NextResponse.json({ error: "This quiz has no graded questions to update" }, { status: 400 });
    }

    const merged = applyManualGradingOverrides(auto, manual);
    if (merged.gradedFieldCount === 0) {
      return NextResponse.json(
        { error: "All graded questions are skipped; at least one must count toward the score" },
        { status: 400 }
      );
    }

    const nextAnswers = {
      ...cleanAnswers,
      _manualGrading: manual,
      _grading: merged,
    };

    const { error: upErr } = await supabase
      .from("hiring_form_submissions")
      .update({ answers: nextAnswers })
      .eq("id", submissionId)
      .eq("business_id", businessId);

    if (upErr) {
      return NextResponse.json({ error: upErr.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("form-submissions PATCH error:", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
