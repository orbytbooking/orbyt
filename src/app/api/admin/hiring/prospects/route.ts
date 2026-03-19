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

    const { data, error } = await supabase
      .from("hiring_prospects")
      .select("*")
      .eq("business_id", businessId)
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ prospects: data ?? [] });
  } catch (error) {
    console.error("Hiring prospects GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
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

    const body = await request.json();
    const firstName = typeof body.firstName === "string" ? body.firstName.trim() : "";
    const lastName = typeof body.lastName === "string" ? body.lastName.trim() : "";
    const email = typeof body.email === "string" ? body.email.trim() : "";

    if (!firstName || !email) {
      return NextResponse.json({ error: "First name and email are required" }, { status: 400 });
    }

    const stage = typeof body.stage === "string" && ALLOWED_STAGES.has(body.stage) ? body.stage : "new";
    const role = typeof body.role === "string" && body.role.trim() ? body.role.trim() : "Prospect";
    const source = typeof body.source === "string" && body.source.trim() ? body.source.trim() : "Manual";
    const name = `${firstName}${lastName ? ` ${lastName}` : ""}`;
    const stepIndex = Number.isInteger(body.stepIndex) ? Math.max(0, Number(body.stepIndex)) : 0;

    const payload = {
      business_id: businessId,
      first_name: firstName,
      last_name: lastName || null,
      name,
      email,
      phone: typeof body.phone === "string" && body.phone.trim() ? body.phone.trim() : null,
      role,
      source,
      stage,
      note: typeof body.note === "string" && body.note.trim() ? body.note : null,
      image: typeof body.image === "string" && body.image.trim() ? body.image : null,
      step_index: stepIndex,
    };

    const { data, error } = await supabase.from("hiring_prospects").insert(payload).select("*").single();
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ prospect: data }, { status: 201 });
  } catch (error) {
    console.error("Hiring prospects POST error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
