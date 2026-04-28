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

/** Remove logged quiz invite emails for a prospect on this form (pending "Email sent" rows). */
export async function DELETE(request: NextRequest, ctx: RouteCtx) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) return createUnauthorizedResponse();

    const businessId = getBusinessId(request);
    if (!businessId) {
      return NextResponse.json({ error: "Business ID required" }, { status: 400 });
    }

    const prospectId = request.nextUrl.searchParams.get("prospectId")?.trim() ?? "";
    if (!prospectId) {
      return NextResponse.json({ error: "prospectId query parameter required" }, { status: 400 });
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
      .select("id, form_kind")
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
      return NextResponse.json({ error: "Only quiz forms support invite log removal" }, { status: 400 });
    }

    const { error: delErr } = await supabase
      .from("hiring_quiz_email_sends")
      .delete()
      .eq("form_id", formId)
      .eq("business_id", businessId)
      .eq("prospect_id", prospectId);

    if (delErr) {
      return NextResponse.json({ error: delErr.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("quiz-email-sends DELETE error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
