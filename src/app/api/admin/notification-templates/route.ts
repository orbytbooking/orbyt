import { NextRequest, NextResponse } from "next/server";
import {
  requireAdminTenantContext,
  assertBusinessIdMatchesContext,
} from "@/lib/adminTenantContext";

/**
 * GET: List notification templates for the business.
 */
export async function GET(request: NextRequest) {
  try {
    const ctx = await requireAdminTenantContext(request);
    if (ctx instanceof NextResponse) return ctx;
    const { supabase, businessId } = ctx;

    const hinted =
      request.headers.get("x-business-id")?.trim() ||
      request.nextUrl.searchParams.get("businessId")?.trim() ||
      null;
    const mismatch = assertBusinessIdMatchesContext(hinted, businessId);
    if (mismatch) return mismatch;

    const { data, error } = await supabase
      .from("business_notification_templates")
      .select("id, business_id, name, subject, body, enabled, is_default, created_at, updated_at")
      .eq("business_id", businessId)
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
    const ctx = await requireAdminTenantContext(request);
    if (ctx instanceof NextResponse) return ctx;
    const { supabase, businessId } = ctx;

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
        .eq("business_id", businessId);
    }

    const now = new Date().toISOString();
    const { data: row, error } = await supabase
      .from("business_notification_templates")
      .insert({
        business_id: businessId,
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
