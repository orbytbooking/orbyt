import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { validateHiringFormFields, formDataToHiringAnswers } from "@/lib/hiring-form-validation";
import { extractProspectFromAnswers } from "@/lib/hiring-form-prospect-from-answers";
import { computeHiringFormGrading } from "@/lib/hiring-form-grading";

const getSupabaseAdmin = () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("Missing Supabase config");
  }
  return createClient(url, key, { auth: { persistSession: false } });
};

type RouteCtx = { params: Promise<{ slug: string }> };

export async function POST(request: NextRequest, ctx: RouteCtx) {
  try {
    const { slug } = await ctx.params;
    const trimmed = slug?.trim();
    if (!trimmed) {
      return NextResponse.json({ error: "Invalid slug" }, { status: 400 });
    }

    const contentType = request.headers.get("content-type") ?? "";
    if (!contentType.includes("multipart/form-data")) {
      return NextResponse.json({ error: "Expected multipart/form-data" }, { status: 415 });
    }

    const supabase = getSupabaseAdmin();
    const { data: formRow, error: formErr } = await supabase
      .from("hiring_forms")
      .select("id, business_id, definition, form_kind")
      .eq("published_slug", trimmed)
      .eq("is_published", true)
      .maybeSingle();

    if (formErr) {
      return NextResponse.json({ error: formErr.message }, { status: 500 });
    }
    if (!formRow) {
      return NextResponse.json({ error: "Form not found" }, { status: 404 });
    }

    const definition = (formRow.definition ?? {}) as { formFields?: unknown[] };
    const formFields = definition.formFields ?? [];

    const fd = await request.formData();
    const linkedProspectRaw = fd.get("hiring_prospect_id");
    const linkedProspectCandidate =
      typeof linkedProspectRaw === "string" ? linkedProspectRaw.trim() : "";
    if (linkedProspectCandidate) {
      fd.delete("hiring_prospect_id");
    }

    const errors = validateHiringFormFields(formFields, fd);
    if (Object.keys(errors).length > 0) {
      return NextResponse.json({ error: "Validation failed", fieldErrors: errors }, { status: 400 });
    }

    const answers = formDataToHiringAnswers(fd) as Record<string, unknown>;
    const rowKind = (formRow as { form_kind?: string }).form_kind;
    const isQuizForm = rowKind === "quiz";
    const grading = isQuizForm ? computeHiringFormGrading(formFields, answers) : null;
    const answersWithGrading =
      grading != null ? { ...answers, _grading: grading } : answers;
    const prospectData = extractProspectFromAnswers(formFields, answersWithGrading);

    let linkedProspectId: string | null = null;
    if (linkedProspectCandidate) {
      const { data: prow } = await supabase
        .from("hiring_prospects")
        .select("id")
        .eq("id", linkedProspectCandidate)
        .eq("business_id", formRow.business_id)
        .maybeSingle();
      if (prow && (prow as { id?: string }).id) {
        linkedProspectId = (prow as { id: string }).id;
      }
    }

    const { data: submission, error: subErr } = await supabase
      .from("hiring_form_submissions")
      .insert({
        business_id: formRow.business_id,
        form_id: formRow.id,
        answers: answersWithGrading,
        ...(linkedProspectId ? { prospect_id: linkedProspectId } : {}),
      })
      .select("id")
      .single();

    if (subErr || !submission) {
      return NextResponse.json({ error: subErr?.message ?? "Could not save submission" }, { status: 500 });
    }

    let prospectId: string | null = linkedProspectId;
    if (!prospectId && prospectData) {
      const name = `${prospectData.firstName}${prospectData.lastName ? ` ${prospectData.lastName}` : ""}`;
      const { data: prospect, error: pErr } = await supabase
        .from("hiring_prospects")
        .insert({
          business_id: formRow.business_id,
          first_name: prospectData.firstName,
          last_name: prospectData.lastName || null,
          name,
          email: prospectData.email,
          phone: prospectData.phone?.trim() ? prospectData.phone.trim() : null,
          role: "Prospect",
          source: "Hiring form",
          stage: "new",
          note: null,
          step_index: 0,
        })
        .select("id")
        .single();

      if (!pErr && prospect?.id) {
        prospectId = prospect.id;
        await supabase.from("hiring_form_submissions").update({ prospect_id: prospectId }).eq("id", submission.id);
      }
    }

    return NextResponse.json({ ok: true, submissionId: submission.id, prospectId });
  } catch (error) {
    console.error("Public hiring form submit error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
