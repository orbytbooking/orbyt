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

type UiSystemLog = {
  id: string;
  createdAt: string;
  kind: string;
  summary: string;
  prospectName: string;
  prospectEmail: string;
};

type UiEmailLog = {
  id: string;
  createdAt: string;
  emailType: "quiz" | "contract";
  formName: string;
  prospectName: string;
  prospectEmail: string;
};

type UiSmsLog = {
  id: string;
  createdAt: string;
  kind: string;
  summary: string;
  prospectName: string;
  prospectEmail: string;
};

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) return createUnauthorizedResponse();

    const businessId = getBusinessId(request);
    if (!businessId) {
      return NextResponse.json({ error: "Business ID required" }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();
    const access = await ensureBusinessAccess(supabase, businessId, user.id);
    if (!access.ok) return access.response;

    const [activitiesRes, smsRes, quizSendsRes, contractSendsRes] = await Promise.all([
      supabase
        .from("hiring_prospect_activities")
        .select("id, prospect_id, kind, summary, created_at")
        .eq("business_id", businessId)
        .not("kind", "ilike", "%sms%")
        .not("summary", "ilike", "%sms%")
        .order("created_at", { ascending: false })
        .limit(300),
      supabase
        .from("hiring_prospect_activities")
        .select("id, prospect_id, kind, summary, created_at")
        .eq("business_id", businessId)
        .or("kind.ilike.%sms%,summary.ilike.%sms%")
        .order("created_at", { ascending: false })
        .limit(300),
      supabase
        .from("hiring_quiz_email_sends")
        .select("id, form_id, prospect_id, sent_at")
        .eq("business_id", businessId)
        .order("sent_at", { ascending: false })
        .limit(300),
      supabase
        .from("hiring_contract_email_sends")
        .select("id, form_id, prospect_id, sent_at")
        .eq("business_id", businessId)
        .order("sent_at", { ascending: false })
        .limit(300),
    ]);

    if (activitiesRes.error) return NextResponse.json({ error: activitiesRes.error.message }, { status: 500 });
    if (smsRes.error) return NextResponse.json({ error: smsRes.error.message }, { status: 500 });
    if (quizSendsRes.error) return NextResponse.json({ error: quizSendsRes.error.message }, { status: 500 });
    if (contractSendsRes.error) return NextResponse.json({ error: contractSendsRes.error.message }, { status: 500 });

    const quizRows = (quizSendsRes.data ?? []) as Array<{
      id: string;
      form_id: string;
      prospect_id: string;
      sent_at: string;
    }>;
    const contractRows = (contractSendsRes.data ?? []) as Array<{
      id: string;
      form_id: string;
      prospect_id: string;
      sent_at: string;
    }>;
    const activityRows = (activitiesRes.data ?? []) as Array<{
      id: string;
      prospect_id: string;
      kind: string;
      summary: string;
      created_at: string;
    }>;
    const smsRows = (smsRes.data ?? []) as Array<{
      id: string;
      prospect_id: string;
      kind: string;
      summary: string;
      created_at: string;
    }>;

    const prospectIds = new Set<string>();
    const formIds = new Set<string>();
    for (const r of activityRows) prospectIds.add(r.prospect_id);
    for (const r of smsRows) prospectIds.add(r.prospect_id);
    for (const r of quizRows) {
      prospectIds.add(r.prospect_id);
      formIds.add(r.form_id);
    }
    for (const r of contractRows) {
      prospectIds.add(r.prospect_id);
      formIds.add(r.form_id);
    }

    const [prospectsRes, formsRes] = await Promise.all([
      prospectIds.size
        ? supabase
            .from("hiring_prospects")
            .select("id, name, email")
            .eq("business_id", businessId)
            .in("id", Array.from(prospectIds))
        : Promise.resolve({ data: [], error: null }),
      formIds.size
        ? supabase
            .from("hiring_forms")
            .select("id, name")
            .eq("business_id", businessId)
            .in("id", Array.from(formIds))
        : Promise.resolve({ data: [], error: null }),
    ]);

    if (prospectsRes.error) return NextResponse.json({ error: prospectsRes.error.message }, { status: 500 });
    if (formsRes.error) return NextResponse.json({ error: formsRes.error.message }, { status: 500 });

    const prospectById = new Map<string, { name: string; email: string }>();
    for (const row of (prospectsRes.data ?? []) as Array<{ id: string; name: string | null; email: string | null }>) {
      prospectById.set(row.id, {
        name: row.name?.trim() || "Unknown prospect",
        email: row.email?.trim() || "",
      });
    }

    const formById = new Map<string, string>();
    for (const row of (formsRes.data ?? []) as Array<{ id: string; name: string | null }>) {
      formById.set(row.id, row.name?.trim() || "Untitled form");
    }

    const systemLogs: UiSystemLog[] = activityRows.map((r) => {
      const p = prospectById.get(r.prospect_id);
      return {
        id: `system:${r.id}`,
        createdAt: r.created_at,
        kind: r.kind,
        summary: r.summary,
        prospectName: p?.name || "Unknown prospect",
        prospectEmail: p?.email || "",
      };
    });

    const smsLogs: UiSmsLog[] = smsRows.map((r) => {
      const p = prospectById.get(r.prospect_id);
      return {
        id: `sms:${r.id}`,
        createdAt: r.created_at,
        kind: r.kind,
        summary: r.summary,
        prospectName: p?.name || "Unknown prospect",
        prospectEmail: p?.email || "",
      };
    });

    const emailLogs: UiEmailLog[] = [
      ...quizRows.map((r) => {
        const p = prospectById.get(r.prospect_id);
        return {
          id: `email:quiz:${r.id}`,
          createdAt: r.sent_at,
          emailType: "quiz" as const,
          formName: formById.get(r.form_id) || "Quiz form",
          prospectName: p?.name || "Unknown prospect",
          prospectEmail: p?.email || "",
        };
      }),
      ...contractRows.map((r) => {
        const p = prospectById.get(r.prospect_id);
        return {
          id: `email:contract:${r.id}`,
          createdAt: r.sent_at,
          emailType: "contract" as const,
          formName: formById.get(r.form_id) || "Contract form",
          prospectName: p?.name || "Unknown prospect",
          prospectEmail: p?.email || "",
        };
      }),
    ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return NextResponse.json({
      systemLogs,
      emailLogs,
      smsLogs,
    });
  } catch (error) {
    console.error("hiring logs GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
