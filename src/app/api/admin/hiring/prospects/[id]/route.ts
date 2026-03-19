import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getAuthenticatedUser, createForbiddenResponse, createUnauthorizedResponse } from "@/lib/auth-helpers";

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
    if (body.stage !== undefined && typeof body.stage === "string" && ALLOWED_STAGES.has(body.stage)) {
      updates.stage = body.stage;
    }

    if (body.name !== undefined && typeof body.name === "string" && body.name.trim()) {
      updates.name = body.name.trim();
    } else if (updates.first_name !== undefined || updates.last_name !== undefined) {
      const { data: currentProspect, error: fetchError } = await supabase
        .from("hiring_prospects")
        .select("first_name,last_name")
        .eq("id", id)
        .eq("business_id", businessId)
        .single();

      if (fetchError || !currentProspect) {
        return NextResponse.json({ error: "Prospect not found" }, { status: 404 });
      }

      const firstName = (updates.first_name as string | null) ?? currentProspect.first_name;
      const lastName = (updates.last_name as string | null) ?? currentProspect.last_name;
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
