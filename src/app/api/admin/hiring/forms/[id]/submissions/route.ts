import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getAuthenticatedUser, createForbiddenResponse, createUnauthorizedResponse } from "@/lib/auth-helpers";
import { extractProspectFromAnswers } from "@/lib/hiring-form-prospect-from-answers";

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

function stripAnswerMeta(answers: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = { ...answers };
  delete out._grading;
  return out;
}

function displayNameFromProspect(p: {
  first_name: string;
  last_name: string | null;
}): string {
  const a = (p.first_name ?? "").trim();
  const b = (p.last_name ?? "").trim();
  return [a, b].filter(Boolean).join(" ") || a || "Respondent";
}

type RouteCtx = { params: Promise<{ id: string }> };

/** List submissions for a hiring form (used from Quizzes tab for quiz forms). */
export async function GET(request: NextRequest, ctx: RouteCtx) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) return createUnauthorizedResponse();

    const businessId = getBusinessId(request);
    if (!businessId) {
      return NextResponse.json({ error: "Business ID required" }, { status: 400 });
    }

    const { id: formId } = await ctx.params;
    if (!formId?.trim()) {
      return NextResponse.json({ error: "Form id required" }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();
    const access = await ensureBusinessAccess(supabase, businessId, user.id);
    if (!access.ok) return access.response;

    const { data: formRow, error: formErr } = await supabase
      .from("hiring_forms")
      .select("id, business_id, form_kind, definition, name")
      .eq("id", formId)
      .eq("business_id", businessId)
      .maybeSingle();

    if (formErr) {
      return NextResponse.json({ error: formErr.message }, { status: 500 });
    }
    if (!formRow) {
      return NextResponse.json({ error: "Form not found" }, { status: 404 });
    }
    if ((formRow as { form_kind?: string }).form_kind !== "quiz") {
      return NextResponse.json({ error: "Submissions list is only available for quiz forms" }, { status: 400 });
    }

    const definition = ((formRow as { definition?: { formFields?: unknown[] } }).definition ?? {}) as {
      formFields?: unknown[];
    };
    const formFields = definition.formFields ?? [];

    const { data: rows, error: subErr } = await supabase
      .from("hiring_form_submissions")
      .select("id, created_at, answers, prospect_id")
      .eq("form_id", formId)
      .eq("business_id", businessId)
      .order("created_at", { ascending: false });

    if (subErr) {
      return NextResponse.json({ error: subErr.message }, { status: 500 });
    }

    const submissions = rows ?? [];
    const prospectIds = [
      ...new Set(
        submissions
          .map((r) => (r as { prospect_id?: string | null }).prospect_id)
          .filter((x): x is string => typeof x === "string" && x.length > 0)
      ),
    ];

    let prospectById = new Map<
      string,
      { first_name: string; last_name: string | null; email: string; phone: string | null }
    >();
    if (prospectIds.length > 0) {
      const { data: prospects } = await supabase
        .from("hiring_prospects")
        .select("id, first_name, last_name, email, phone")
        .in("id", prospectIds)
        .eq("business_id", businessId);
      prospectById = new Map(
        (prospects ?? []).map((p) => [
          (p as { id: string }).id,
          p as { first_name: string; last_name: string | null; email: string; phone: string | null },
        ])
      );
    }

    const payload = submissions.map((raw) => {
      const row = raw as {
        id: string;
        created_at: string;
        answers: Record<string, unknown> | null;
        prospect_id: string | null;
      };
      const answers = (row.answers ?? {}) as Record<string, unknown>;
      const grading = answers._grading as
        | { gradedFieldCount?: number; scorePercent?: number | null }
        | undefined;
      const clean = stripAnswerMeta(answers);
      const prospect = row.prospect_id ? prospectById.get(row.prospect_id) : undefined;
      const extracted = extractProspectFromAnswers(formFields, clean);

      const email = prospect?.email?.trim() || extracted?.email?.trim() || "";
      const phone = (prospect?.phone ?? extracted?.phone ?? "").trim() || "—";
      let name: string;
      if (prospect) {
        name = displayNameFromProspect(prospect);
      } else if (extracted) {
        name = [extracted.firstName, extracted.lastName].filter(Boolean).join(" ").trim() || "Respondent";
      } else {
        name = email ? email.split("@")[0] ?? "Respondent" : "Respondent";
      }

      const gradedCount = grading?.gradedFieldCount ?? 0;
      const gradedLabel = gradedCount > 0 ? "Yes" : "No";
      const scoreLabel =
        typeof grading?.scorePercent === "number" && !Number.isNaN(grading.scorePercent)
          ? `${grading.scorePercent}%`
          : "—";

      return {
        id: row.id,
        prospectId: row.prospect_id,
        createdAt: row.created_at,
        name,
        email: email || "—",
        phone,
        gradedLabel,
        scoreLabel,
        answers,
      };
    });

    return NextResponse.json({
      formName: (formRow as { name?: string }).name ?? "",
      submissions: payload,
    });
  } catch (error) {
    console.error("Hiring form submissions GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
