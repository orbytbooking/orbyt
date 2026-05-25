import { NextRequest, NextResponse } from "next/server";
import {
  requireAdminTenantContext,
  assertBusinessIdMatchesContext,
} from "@/lib/adminTenantContext";

type Ctx = { params: Promise<{ id: string }> };

/**
 * GET: Single template (must belong to business).
 */
export async function GET(request: NextRequest, { params }: Ctx) {
  try {
    const ctx = await requireAdminTenantContext(request);
    if (ctx instanceof NextResponse) return ctx;
    const { supabase, businessId } = ctx;

    const { id } = await params;
    const hinted =
      request.headers.get("x-business-id")?.trim() ||
      request.nextUrl.searchParams.get("businessId")?.trim() ||
      null;
    const mismatch = assertBusinessIdMatchesContext(hinted, businessId);
    if (mismatch) return mismatch;

    const { data: row, error } = await supabase
      .from("business_notification_templates")
      .select("id, business_id, name, subject, body, enabled, is_default, created_at, updated_at")
      .eq("id", id)
      .eq("business_id", businessId)
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
    const ctx = await requireAdminTenantContext(request);
    if (ctx instanceof NextResponse) return ctx;
    const { supabase, businessId } = ctx;

    const { id } = await params;

    let body: {
      name?: string;
      subject?: string;
      body?: string;
      enabled?: boolean;
      is_default?: boolean;
      businessId?: string;
    } = {};
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    const hinted =
      request.headers.get("x-business-id")?.trim() ||
      (typeof body.businessId === "string" ? body.businessId.trim() : "") ||
      null;
    const mismatch = assertBusinessIdMatchesContext(hinted, businessId);
    if (mismatch) return mismatch;

    const { data: existing } = await supabase
      .from("business_notification_templates")
      .select("id")
      .eq("id", id)
      .eq("business_id", businessId)
      .maybeSingle();
    if (!existing) {
      return NextResponse.json({ error: "Template not found" }, { status: 404 });
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
        .eq("business_id", businessId);
      update.is_default = true;
    } else if (body.is_default === false) {
      update.is_default = false;
    }

    const { data: row, error } = await supabase
      .from("business_notification_templates")
      .update(update)
      .eq("id", id)
      .eq("business_id", businessId)
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
    const ctx = await requireAdminTenantContext(request);
    if (ctx instanceof NextResponse) return ctx;
    const { supabase, businessId } = ctx;

    const { id } = await params;
    const hinted =
      request.headers.get("x-business-id")?.trim() ||
      request.nextUrl.searchParams.get("businessId")?.trim() ||
      null;
    const mismatch = assertBusinessIdMatchesContext(hinted, businessId);
    if (mismatch) return mismatch;

    const { error } = await supabase
      .from("business_notification_templates")
      .delete()
      .eq("id", id)
      .eq("business_id", businessId);

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
