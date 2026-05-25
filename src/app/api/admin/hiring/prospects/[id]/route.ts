import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getAuthenticatedUser, createForbiddenResponse, createUnauthorizedResponse } from "@/lib/auth-helpers";
import { resolveProspectActivityActorName } from "@/lib/auth-user-display-name";
import {
  mergeFunnelStepStatusesPatch,
  normalizeFunnelStepStatusesFromDb,
} from "@/lib/hiring-prospect-funnel-step-statuses";

const ALLOWED_STAGES = new Set(["new", "screening", "interview", "hired", "rejected"]);

const getSupabaseAdmin = () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("Missing Supabase config");
  }
  return createClient(url, key, { auth: { persistSession: false } });
};

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

const toNullableString = (value: unknown) =>
  typeof value === "string" && value.trim() ? value.trim() : null;

/** Accept ISO string from client; null clears. Invalid string → 400. */
const parseInterviewInstant = (value: unknown): { ok: true; iso: string | null } | { ok: false } => {
  if (value === null) return { ok: true, iso: null };
  if (typeof value !== "string") return { ok: false };
  const t = value.trim();
  if (!t) return { ok: true, iso: null };
  const d = new Date(t);
  if (Number.isNaN(d.getTime())) return { ok: false };
  return { ok: true, iso: d.toISOString() };
};

type ProspectRow = {
  first_name: string | null;
  last_name: string | null;
  name: string;
  email: string;
  phone: string | null;
  note: string | null;
  image: string | null;
  role: string;
  source: string;
  stage: string;
  step_index: number;
  interview_starts_at: string | null;
  interview_ends_at: string | null;
};

const normStr = (v: unknown) => (v == null ? "" : String(v).trim());

const normNote = (v: unknown) => normStr(v);

const stageLabel = (stage: string) => {
  if (stage === "rejected") return "Rejected";
  if (stage === "interview") return "Interview";
  if (stage === "hired") return "Onboarded";
  if (stage === "screening") return "Screening";
  if (stage === "new") return "New";
  return stage;
};

const fieldLabel: Record<string, string> = {
  first_name: "First name",
  last_name: "Last name",
  email: "Email",
  phone: "Phone",
  note: "Note",
  image: "Profile photo",
  role: "Role",
  source: "Source",
  step_index: "Funnel step",
  interview_starts_at: "Interview start",
  interview_ends_at: "Interview end",
};

function buildProspectUpdateSummary(
  before: ProspectRow,
  after: ProspectRow,
  firstOrLastInPatch: boolean,
  explicitNameInPatch: boolean,
): string | null {
  const parts: string[] = [];

  if (before.stage !== after.stage) {
    parts.push(`Stage: ${stageLabel(before.stage)} → ${stageLabel(after.stage)}`);
  }

  const keys = [
    "first_name",
    "last_name",
    "email",
    "phone",
    "note",
    "image",
    "role",
    "source",
    "step_index",
    "interview_starts_at",
    "interview_ends_at",
  ] as const;
  for (const key of keys) {
    const a =
      key === "note"
        ? normNote(before[key])
        : key === "phone"
          ? normStr(before[key])
          : key === "interview_starts_at" || key === "interview_ends_at"
            ? normStr(before[key])
            : before[key];
    const b =
      key === "note"
        ? normNote(after[key])
        : key === "phone"
          ? normStr(after[key])
          : key === "interview_starts_at" || key === "interview_ends_at"
            ? normStr(after[key])
            : after[key];
    if (a !== b) {
      parts.push(fieldLabel[key] ?? key);
    }
  }

  if (
    explicitNameInPatch &&
    !firstOrLastInPatch &&
    normStr(before.name) !== normStr(after.name) &&
    before.first_name === after.first_name &&
    before.last_name === after.last_name
  ) {
    parts.push("Display name");
  }

  if (parts.length === 0) return null;
  if (parts.length === 1) return `Updated ${parts[0]}`;
  return `Updated: ${parts.join(", ")}`;
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) return createUnauthorizedResponse();

    const businessId = request.headers.get("x-business-id") || request.nextUrl.searchParams.get("businessId");
    if (!businessId) {
      return NextResponse.json({ error: "Business ID required" }, { status: 400 });
    }

    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: "Prospect ID is required" }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();
    const access = await ensureBusinessAccess(supabase, businessId, user.id);
    if (!access.ok) return access.response;

    // Use `*` so this route works before migration 138 adds interview_* columns;
    // an explicit select on missing columns makes PostgREST error and we must not
    // map that to "Prospect not found".
    const { data: currentRow, error: curErr } = await supabase
      .from("hiring_prospects")
      .select("*")
      .eq("id", id)
      .eq("business_id", businessId)
      .maybeSingle();

    if (curErr) {
      console.error("hiring_prospects PATCH prefetch:", curErr.message);
      return NextResponse.json({ error: curErr.message }, { status: 500 });
    }
    if (!currentRow) {
      return NextResponse.json({ error: "Prospect not found" }, { status: 404 });
    }

    const cur = currentRow as ProspectRow & {
      interview_starts_at?: string | null;
      interview_ends_at?: string | null;
    };
    const before: ProspectRow = {
      ...cur,
      interview_starts_at: cur.interview_starts_at ?? null,
      interview_ends_at: cur.interview_ends_at ?? null,
    };

    const body = await request.json();
    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };

    if (body.firstName !== undefined) updates.first_name = toNullableString(body.firstName);
    if (body.lastName !== undefined) updates.last_name = toNullableString(body.lastName);
    if (body.email !== undefined) updates.email = toNullableString(body.email);
    if (body.phone !== undefined) updates.phone = toNullableString(body.phone);
    if (body.role !== undefined) updates.role = toNullableString(body.role);
    if (body.source !== undefined) updates.source = toNullableString(body.source);
    if (body.note !== undefined) updates.note = toNullableString(body.note);
    if (body.image !== undefined) updates.image = toNullableString(body.image);
    if (body.stepIndex !== undefined && Number.isInteger(body.stepIndex)) {
      updates.step_index = Math.max(0, Number(body.stepIndex));
    }
    if (body.funnelId !== undefined) {
      if (body.funnelId === null) {
        updates.funnel_id = null;
      } else if (typeof body.funnelId === "string") {
        const t = body.funnelId.trim();
        updates.funnel_id = !t || t === "default" ? null : t.length <= 200 ? t : null;
      }
    }
    if (body.funnelStepStatuses !== undefined) {
      const existing = normalizeFunnelStepStatusesFromDb(
        (cur as { funnel_step_statuses?: unknown }).funnel_step_statuses,
      );
      updates.funnel_step_statuses = mergeFunnelStepStatusesPatch(existing, body.funnelStepStatuses);
    }
    if (body.stage !== undefined && typeof body.stage === "string" && ALLOWED_STAGES.has(body.stage)) {
      updates.stage = body.stage;
    }

    if (body.interviewStartsAt !== undefined) {
      const parsed = parseInterviewInstant(body.interviewStartsAt);
      if (!parsed.ok) {
        return NextResponse.json({ error: "Invalid interview start time" }, { status: 400 });
      }
      updates.interview_starts_at = parsed.iso;
    }
    if (body.interviewEndsAt !== undefined) {
      const parsed = parseInterviewInstant(body.interviewEndsAt);
      if (!parsed.ok) {
        return NextResponse.json({ error: "Invalid interview end time" }, { status: 400 });
      }
      updates.interview_ends_at = parsed.iso;
    }

    const effectiveStart =
      (updates.interview_starts_at as string | null | undefined) !== undefined
        ? (updates.interview_starts_at as string | null)
        : (before.interview_starts_at ?? null);
    const effectiveEnd =
      (updates.interview_ends_at as string | null | undefined) !== undefined
        ? (updates.interview_ends_at as string | null)
        : (before.interview_ends_at ?? null);
    if (effectiveStart && effectiveEnd) {
      if (new Date(effectiveEnd).getTime() <= new Date(effectiveStart).getTime()) {
        return NextResponse.json({ error: "Interview end time must be after start time" }, { status: 400 });
      }
    }

    const firstOrLastInPatch = body.firstName !== undefined || body.lastName !== undefined;
    const explicitNameInPatch = body.name !== undefined && typeof body.name === "string" && body.name.trim().length > 0;

    if (explicitNameInPatch) {
      updates.name = (body.name as string).trim();
    } else if (updates.first_name !== undefined || updates.last_name !== undefined) {
      const firstName = (updates.first_name as string | null) ?? before.first_name;
      const lastName = (updates.last_name as string | null) ?? before.last_name;
      if (firstName) {
        updates.name = `${firstName}${lastName ? ` ${lastName}` : ""}`;
      }
    }

    const { data, error } = await supabase
      .from("hiring_prospects")
      .update(updates)
      .eq("id", id)
      .eq("business_id", businessId)
      .select("*")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const row = data as Record<string, unknown>;
    const after: ProspectRow = {
      first_name: (row.first_name as string | null) ?? null,
      last_name: (row.last_name as string | null) ?? null,
      name: String(row.name ?? ""),
      email: String(row.email ?? ""),
      phone: (row.phone as string | null) ?? null,
      note: (row.note as string | null) ?? null,
      image: (row.image as string | null) ?? null,
      role: String(row.role ?? ""),
      source: String(row.source ?? ""),
      stage: String(row.stage ?? ""),
      step_index: typeof row.step_index === "number" ? row.step_index : 0,
      interview_starts_at: (row.interview_starts_at as string | null) ?? null,
      interview_ends_at: (row.interview_ends_at as string | null) ?? null,
    };

    const patchKeys = Object.keys(updates).filter((k) => k !== "updated_at");
    if (patchKeys.length > 0) {
      const summary = buildProspectUpdateSummary(before, after, firstOrLastInPatch, explicitNameInPatch);
      if (summary) {
        const actorName = await resolveProspectActivityActorName(supabase, user);
        const { error: actErr } = await supabase.from("hiring_prospect_activities").insert({
          business_id: businessId,
          prospect_id: id,
          kind: "prospect_updated",
          summary: `${summary} by ${actorName}`,
          metadata: { actorUserId: user.id, actorName },
        });
        if (actErr) {
          console.error("hiring_prospect_activities insert (patch):", actErr.message);
        }
      }
    }

    return NextResponse.json({ prospect: data });
  } catch (error) {
    console.error("Hiring prospects PATCH error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) return createUnauthorizedResponse();

    const businessId = request.headers.get("x-business-id") || request.nextUrl.searchParams.get("businessId");
    if (!businessId) {
      return NextResponse.json({ error: "Business ID required" }, { status: 400 });
    }

    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: "Prospect ID is required" }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();
    const access = await ensureBusinessAccess(supabase, businessId, user.id);
    if (!access.ok) return access.response;

    const { error } = await supabase.from("hiring_prospects").delete().eq("id", id).eq("business_id", businessId);
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Hiring prospects DELETE error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
