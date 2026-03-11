import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getAuthenticatedUser, createUnauthorizedResponse, createForbiddenResponse } from "@/lib/auth-helpers";

/** GET: List integration config for the business (only whether enabled, never return raw keys) */
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) return createUnauthorizedResponse();

    const businessId = request.headers.get("x-business-id") || request.nextUrl.searchParams.get("business");
    if (!businessId) {
      return NextResponse.json({ error: "Business ID required" }, { status: 400 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const { data: business, error: bizError } = await supabase
      .from("businesses")
      .select("id, owner_id")
      .eq("id", businessId)
      .single();

    if (bizError || !business) {
      return NextResponse.json({ error: "Business not found" }, { status: 404 });
    }
    if ((business as { owner_id?: string }).owner_id !== user.id) {
      return createForbiddenResponse("You do not own this business");
    }

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
    const user = await getAuthenticatedUser();
    if (!user) return createUnauthorizedResponse();

    const businessId = request.headers.get("x-business-id");
    if (!businessId) {
      return NextResponse.json({ error: "Business ID required" }, { status: 400 });
    }

    let body: { providerSlug?: string; apiKey?: string | null; apiSecret?: string | null; enabled?: boolean } = {};
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    const { providerSlug, apiKey, apiSecret, enabled } = body;
    if (!providerSlug) {
      return NextResponse.json({ error: "providerSlug required" }, { status: 400 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const { data: business, error: bizError } = await supabase
      .from("businesses")
      .select("id, owner_id")
      .eq("id", businessId)
      .single();

    if (bizError || !business) {
      return NextResponse.json({ error: "Business not found" }, { status: 404 });
    }
    if ((business as { owner_id?: string }).owner_id !== user.id) {
      return createForbiddenResponse("You do not own this business");
    }

    const updatePayload: { api_key?: string | null; api_secret?: string | null; enabled?: boolean; updated_at: string } = {
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
