import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import {
  getAuthenticatedUser,
  createUnauthorizedResponse,
  createForbiddenResponse,
} from "@/lib/auth-helpers";

async function requireBusinessOwner(businessId: string | null) {
  if (!businessId) {
    return { error: NextResponse.json({ error: "Business ID required" }, { status: 400 }) as NextResponse };
  }
  const user = await getAuthenticatedUser();
  if (!user) return { error: createUnauthorizedResponse() };
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
  const { data: business, error } = await supabase
    .from("businesses")
    .select("id, owner_id")
    .eq("id", businessId)
    .single();
  if (error || !business) {
    return { error: NextResponse.json({ error: "Business not found" }, { status: 404 }) };
  }
  if ((business as { owner_id: string | null }).owner_id !== user.id) {
    return { error: createForbiddenResponse("You do not own this business") };
  }
  return { error: null as null, supabase, businessId };
}

/**
 * GET: List notification templates for the business.
 */
export async function GET(request: NextRequest) {
  try {
    const businessId = request.headers.get("x-business-id") || request.nextUrl.searchParams.get("businessId");
    const gate = await requireBusinessOwner(businessId);
    if (gate.error) return gate.error;
    const { supabase, businessId: bid } = gate;

    const { data, error } = await supabase
      .from("business_notification_templates")
      .select("id, business_id, name, subject, body, enabled, is_default, created_at, updated_at")
      .eq("business_id", bid)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("notification-templates GET:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ templates: data ?? [] });
  } catch (e) {
    console.error("notification-templates GET:", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * POST: Create a template.
 */
export async function POST(request: NextRequest) {
  try {
    const businessId = request.headers.get("x-business-id");
    const gate = await requireBusinessOwner(businessId);
    if (gate.error) return gate.error;
    const { supabase, businessId: bid } = gate;

    let body: { name?: string; subject?: string; body?: string; enabled?: boolean; is_default?: boolean } = {};
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    const name = String(body.name ?? "").trim();
    if (!name) {
      return NextResponse.json({ error: "name is required" }, { status: 400 });
    }

    const subject = String(body.subject ?? "");
    const htmlBody = String(body.body ?? "");
    const enabled = body.enabled !== false;
    const isDefault = body.is_default === true;

    if (isDefault) {
      await supabase
        .from("business_notification_templates")
        .update({ is_default: false, updated_at: new Date().toISOString() })
        .eq("business_id", bid);
    }

    const now = new Date().toISOString();
    const { data: row, error } = await supabase
      .from("business_notification_templates")
      .insert({
        business_id: bid,
        name,
        subject,
        body: htmlBody,
        enabled,
        is_default: isDefault,
        created_at: now,
        updated_at: now,
      })
      .select("id, business_id, name, subject, body, enabled, is_default, created_at, updated_at")
      .single();

    if (error) {
      console.error("notification-templates POST:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ template: row }, { status: 201 });
  } catch (e) {
    console.error("notification-templates POST:", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
