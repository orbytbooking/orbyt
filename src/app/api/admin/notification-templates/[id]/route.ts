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

type Ctx = { params: Promise<{ id: string }> };

/**
 * GET: Single template (must belong to business).
 */
export async function GET(request: NextRequest, { params }: Ctx) {
  try {
    const { id } = await params;
    const businessId = request.headers.get("x-business-id");
    const gate = await requireBusinessOwner(businessId);
    if (gate.error) return gate.error;
    const { supabase, businessId: bid } = gate;

    const { data: row, error } = await supabase
      .from("business_notification_templates")
      .select("id, business_id, name, subject, body, enabled, is_default, created_at, updated_at")
      .eq("id", id)
      .eq("business_id", bid)
      .maybeSingle();

    if (error) {
      console.error("notification-templates GET [id]:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    if (!row) {
      return NextResponse.json({ error: "Template not found" }, { status: 404 });
    }
    return NextResponse.json({ template: row });
  } catch (e) {
    console.error("notification-templates GET [id]:", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * PATCH: Update fields. Setting is_default true clears default on other rows for this business.
 */
export async function PATCH(request: NextRequest, { params }: Ctx) {
  try {
    const { id } = await params;
    const businessId = request.headers.get("x-business-id");
    const gate = await requireBusinessOwner(businessId);
    if (gate.error) return gate.error;
    const { supabase, businessId: bid } = gate;

    const { data: existing } = await supabase
      .from("business_notification_templates")
      .select("id")
      .eq("id", id)
      .eq("business_id", bid)
      .maybeSingle();
    if (!existing) {
      return NextResponse.json({ error: "Template not found" }, { status: 404 });
    }

    let body: {
      name?: string;
      subject?: string;
      body?: string;
      enabled?: boolean;
      is_default?: boolean;
    } = {};
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    const update: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (body.name !== undefined) {
      const name = String(body.name).trim();
      if (!name) {
        return NextResponse.json({ error: "name cannot be empty" }, { status: 400 });
      }
      update.name = name;
    }
    if (body.subject !== undefined) update.subject = String(body.subject);
    if (body.body !== undefined) update.body = String(body.body);
    if (body.enabled !== undefined) update.enabled = Boolean(body.enabled);
    if (body.is_default === true) {
      await supabase
        .from("business_notification_templates")
        .update({ is_default: false, updated_at: new Date().toISOString() })
        .eq("business_id", bid);
      update.is_default = true;
    } else if (body.is_default === false) {
      update.is_default = false;
    }

    const { data: row, error } = await supabase
      .from("business_notification_templates")
      .update(update)
      .eq("id", id)
      .eq("business_id", bid)
      .select("id, business_id, name, subject, body, enabled, is_default, created_at, updated_at")
      .single();

    if (error) {
      console.error("notification-templates PATCH:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ template: row });
  } catch (e) {
    console.error("notification-templates PATCH:", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * DELETE: Remove template.
 */
export async function DELETE(request: NextRequest, { params }: Ctx) {
  try {
    const { id } = await params;
    const businessId = request.headers.get("x-business-id");
    const gate = await requireBusinessOwner(businessId);
    if (gate.error) return gate.error;
    const { supabase, businessId: bid } = gate;

    const { error } = await supabase
      .from("business_notification_templates")
      .delete()
      .eq("id", id)
      .eq("business_id", bid);

    if (error) {
      console.error("notification-templates DELETE:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("notification-templates DELETE:", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
