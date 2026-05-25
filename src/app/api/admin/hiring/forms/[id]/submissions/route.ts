import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getAuthenticatedUser, createForbiddenResponse, createUnauthorizedResponse } from "@/lib/auth-helpers";
import {
  displayNameFromHiringAnswers,
  extractProspectFromAnswers,
} from "@/lib/hiring-form-prospect-from-answers";

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
  name?: string | null;
  email?: string | null;
}): string {
  const a = (p.first_name ?? "").trim();
  const b = (p.last_name ?? "").trim();
  const joined = [a, b].filter(Boolean).join(" ").trim();
  if (joined) return joined;
  if (a) return a;
  const fullName = (p.name ?? "").trim();
  if (fullName) return fullName;
  const em = (p.email ?? "").trim();
  if (em) return em.split("@")[0] || "Respondent";
  return "Respondent";
}

type RouteCtx = { params: Promise<{ id: string }> };

type QuizRespondentListRow = {
  id: string;
  status: "completed" | "sent";
  prospectId: string | null;
  createdAt: string;
  name: string;
  email: string;
  phone: string;
  gradedLabel: string;
  scoreLabel: string;
  answers: Record<string, unknown>;
};

/** List submissions + pending email invites for quiz or contract hiring forms. */
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
    const formKind = (formRow as { form_kind?: string }).form_kind;
    if (formKind !== "quiz" && formKind !== "contract") {
      return NextResponse.json(
        { error: "Submissions list is only available for quiz or contract forms" },
        { status: 400 }
      );
    }
    const isQuiz = formKind === "quiz";

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
      {
        first_name: string;
        last_name: string | null;
        name: string;
        email: string;
        phone: string | null;
      }
    >();
    if (prospectIds.length > 0) {
      const { data: prospects } = await supabase
        .from("hiring_prospects")
        .select("id, first_name, last_name, name, email, phone")
        .in("id", prospectIds)
        .eq("business_id", businessId);
      prospectById = new Map(
        (prospects ?? []).map((p) => [
          (p as { id: string }).id,
          p as {
            first_name: string;
            last_name: string | null;
            name: string;
            email: string;
            phone: string | null;
          },
        ])
      );
    }

    const latestSubmissionAtByProspect = new Map<string, string>();

    const completedRows: QuizRespondentListRow[] = submissions.map((raw) => {
      const row = raw as {
        id: string;
        created_at: string;
        answers: Record<string, unknown> | null;
        prospect_id: string | null;
      };
      const answers = (row.answers ?? {}) as Record<string, unknown>;
      const grading = isQuiz
        ? (answers._grading as { gradedFieldCount?: number; scorePercent?: number | null } | undefined)
        : undefined;
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
        const fromAnswers = displayNameFromHiringAnswers(formFields, clean);
        name =
          fromAnswers ||
          (email ? email.split("@")[0] ?? "Respondent" : "Respondent");
      }

      const gradedCount = isQuiz ? grading?.gradedFieldCount ?? 0 : 0;
      const gradedLabel = isQuiz ? (gradedCount > 0 ? "Yes" : "No") : "—";
      const scoreLabel =
        isQuiz &&
        typeof grading?.scorePercent === "number" &&
        !Number.isNaN(grading.scorePercent)
          ? `${grading.scorePercent}%`
          : "—";

      if (row.prospect_id) {
        const prev = latestSubmissionAtByProspect.get(row.prospect_id);
        if (!prev || row.created_at > prev) {
          latestSubmissionAtByProspect.set(row.prospect_id, row.created_at);
        }
      }

      return {
        id: row.id,
        status: "completed" as const,
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

    const sendTable = isQuiz ? "hiring_quiz_email_sends" : "hiring_contract_email_sends";
    const { data: sendRows, error: sendErr } = await supabase
      .from(sendTable)
      .select("prospect_id, sent_at")
      .eq("form_id", formId)
      .eq("business_id", businessId);

    if (sendErr) {
      return NextResponse.json({ error: sendErr.message }, { status: 500 });
    }

    const maxSentAtByProspect = new Map<string, string>();
    for (const s of sendRows ?? []) {
      const pid = (s as { prospect_id?: string }).prospect_id;
      const at = (s as { sent_at?: string }).sent_at;
      if (typeof pid !== "string" || !pid || typeof at !== "string" || !at) continue;
      const prev = maxSentAtByProspect.get(pid);
      if (!prev || at > prev) maxSentAtByProspect.set(pid, at);
    }

    const pendingProspectIds: string[] = [];
    for (const [pid, maxSent] of maxSentAtByProspect) {
      const latestSub = latestSubmissionAtByProspect.get(pid);
      if (!latestSub || latestSub < maxSent) {
        pendingProspectIds.push(pid);
      }
    }

    const extraProspectIds = pendingProspectIds.filter((pid) => !prospectById.has(pid));
    if (extraProspectIds.length > 0) {
      const { data: extraProspects } = await supabase
        .from("hiring_prospects")
        .select("id, first_name, last_name, name, email, phone")
        .in("id", extraProspectIds)
        .eq("business_id", businessId);
      for (const p of extraProspects ?? []) {
        const row = p as {
          id: string;
          first_name: string;
          last_name: string | null;
          name: string;
          email: string;
          phone: string | null;
        };
        prospectById.set(row.id, row);
      }
    }

    const sentRows: QuizRespondentListRow[] = [];
    for (const pid of pendingProspectIds) {
      const prospect = prospectById.get(pid);
      const maxSent = maxSentAtByProspect.get(pid);
      if (!prospect || !maxSent) continue;
      const email = prospect.email?.trim() || "—";
      const phone = (prospect.phone ?? "").trim() || "—";
      sentRows.push({
        id: `sent:${pid}`,
        status: "sent",
        prospectId: pid,
        createdAt: maxSent,
        name: displayNameFromProspect(prospect),
        email: email || "—",
        phone,
        gradedLabel: "—",
        scoreLabel: "—",
        answers: {},
      });
    }

    const payload = [...completedRows, ...sentRows].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));

    return NextResponse.json({
      formName: (formRow as { name?: string }).name ?? "",
      submissions: payload,
    });
  } catch (error) {
    console.error("Hiring form submissions GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
