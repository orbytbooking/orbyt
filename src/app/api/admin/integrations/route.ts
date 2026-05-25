import { NextRequest, NextResponse } from "next/server";
import {
  requireAdminTenantContext,
  assertBusinessIdMatchesContext,
} from "@/lib/adminTenantContext";

/** GET: List integration config for the business (only whether enabled, never return raw keys) */
export async function GET(request: NextRequest) {
  try {
    const ctx = await requireAdminTenantContext(request);
    if (ctx instanceof NextResponse) return ctx;
    const { supabase, businessId } = ctx;

    const hinted =
      request.headers.get("x-business-id")?.trim() ||
      request.nextUrl.searchParams.get("business")?.trim() ||
      request.nextUrl.searchParams.get("businessId")?.trim() ||
      null;
    const mismatch = assertBusinessIdMatchesContext(hinted, businessId);
    if (mismatch) return mismatch;

    const { data: rows, error: fetchErr } = await supabase
      .from("business_integrations")
      .select("provider_slug, enabled, api_key")
      .eq("business_id", businessId);

    if (fetchErr) {
      console.warn("Integrations GET business_integrations query:", fetchErr.code, fetchErr.message);
      return NextResponse.json({ config: {} });
    }

    const config: Record<string, { enabled: boolean; configured: boolean }> = {};
    (rows || []).forEach((r: { provider_slug: string; enabled: boolean; api_key?: string | null }) => {
      config[r.provider_slug] = { enabled: r.enabled, configured: !!r.api_key };
    });
    return NextResponse.json({ config });
  } catch (err) {
    console.error("Integrations GET:", err);
    return NextResponse.json({ error: "Failed to load integrations" }, { status: 500 });
  }
}

/** PATCH: Save API key/secret for an integration (per business) */
export async function PATCH(request: NextRequest) {
  try {
    const ctx = await requireAdminTenantContext(request);
    if (ctx instanceof NextResponse) return ctx;
    const { supabase, businessId } = ctx;

    let body: {
      providerSlug?: string;
      apiKey?: string | null;
      apiSecret?: string | null;
      enabled?: boolean;
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

    const { providerSlug, apiKey, apiSecret, enabled } = body;
    if (!providerSlug) {
      return NextResponse.json({ error: "providerSlug required" }, { status: 400 });
    }

    const updatePayload: {
      api_key?: string | null;
      api_secret?: string | null;
      enabled?: boolean;
      updated_at: string;
    } = {
      updated_at: new Date().toISOString(),
    };
    if (apiKey !== undefined) updatePayload.api_key = apiKey === null || apiKey === "" ? null : apiKey;
    if (apiSecret !== undefined) updatePayload.api_secret = apiSecret === null || apiSecret === "" ? null : apiSecret;
    if (enabled !== undefined) updatePayload.enabled = enabled;

    const { data: existing } = await supabase
      .from("business_integrations")
      .select("id")
      .eq("business_id", businessId)
      .eq("provider_slug", providerSlug)
      .single();

    if (existing) {
      const { error: updateErr } = await supabase
        .from("business_integrations")
        .update(updatePayload)
        .eq("business_id", businessId)
        .eq("provider_slug", providerSlug);
      if (updateErr) {
        console.error("Integrations PATCH update:", updateErr);
        return NextResponse.json({ error: "Failed to update integration" }, { status: 500 });
      }
    } else {
      const { error: insertErr } = await supabase.from("business_integrations").insert({
        business_id: businessId,
        provider_slug: providerSlug,
        api_key: updatePayload.api_key ?? null,
        api_secret: updatePayload.api_secret ?? null,
        enabled: updatePayload.enabled ?? true,
      });
      if (insertErr) {
        console.error("Integrations PATCH insert:", insertErr);
        return NextResponse.json({ error: "Failed to save integration" }, { status: 500 });
      }
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Integrations PATCH:", err);
    return NextResponse.json({ error: "Failed to save integration" }, { status: 500 });
  }
}
