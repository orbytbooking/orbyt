import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";

/**
 * GET ?code=...&state=...
 * Callback from Google OAuth. Exchanges code for tokens and stores refresh_token for the business.
 * Redirects back to Settings > General > Apps & Integrations with ?google_calendar=success or error.
 */
export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const state = request.nextUrl.searchParams.get("state");
  const errorParam = request.nextUrl.searchParams.get("error");

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin;
  const returnPath = "/admin/settings/general";
  const returnUrl = `${baseUrl}${returnPath}?tab=apps-integrations`;

  if (errorParam) {
    const err = errorParam === "access_denied" ? "Access was denied." : errorParam;
    return NextResponse.redirect(`${returnUrl}&google_calendar=error&message=${encodeURIComponent(err)}`);
  }

  if (!code || !state) {
    return NextResponse.redirect(`${returnUrl}&google_calendar=error&message=${encodeURIComponent("Missing code or state")}`);
  }

  let businessId: string;
  try {
    const decoded = JSON.parse(Buffer.from(state, "base64url").toString());
    businessId = decoded.businessId;
    if (!businessId) throw new Error("No businessId in state");
  } catch {
    return NextResponse.redirect(`${returnUrl}&google_calendar=error&message=${encodeURIComponent("Invalid state")}`);
  }

  const clientId = process.env.GOOGLE_CALENDAR_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CALENDAR_CLIENT_SECRET;
  const redirectUri = process.env.GOOGLE_CALENDAR_REDIRECT_URI;

  if (!clientId || !clientSecret || !redirectUri) {
    return NextResponse.redirect(`${returnUrl}&google_calendar=error&message=${encodeURIComponent("Server not configured")}`);
  }

  const body = new URLSearchParams({
    code,
    client_id: clientId,
    client_secret: clientSecret,
    redirect_uri: redirectUri,
    grant_type: "authorization_code",
  });

  const tokenRes = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });

  if (!tokenRes.ok) {
    const errText = await tokenRes.text();
    console.error("Google token exchange failed:", tokenRes.status, errText);
    return NextResponse.redirect(`${returnUrl}&google_calendar=error&message=${encodeURIComponent("Could not get access token")}`);
  }

  const tokens = (await tokenRes.json()) as { refresh_token?: string; access_token?: string };
  const refreshToken = tokens.refresh_token;
  if (!refreshToken) {
    return NextResponse.redirect(`${returnUrl}&google_calendar=error&message=${encodeURIComponent("No refresh token returned")}`);
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !supabaseServiceKey) {
    return NextResponse.redirect(`${returnUrl}&google_calendar=error&message=${encodeURIComponent("Server error")}`);
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  const { data: existing } = await supabase
    .from("business_integrations")
    .select("id")
    .eq("business_id", businessId)
    .eq("provider_slug", "google_calendar")
    .single();

  if (existing) {
    const { error: updateErr } = await supabase
      .from("business_integrations")
      .update({
        api_key: "oauth",
        api_secret: refreshToken,
        enabled: true,
        updated_at: new Date().toISOString(),
      })
      .eq("business_id", businessId)
      .eq("provider_slug", "google_calendar");
    if (updateErr) {
      console.error("Google Calendar callback: update failed", updateErr);
      return NextResponse.redirect(`${returnUrl}&google_calendar=error&message=${encodeURIComponent("Failed to save connection")}`);
    }
  } else {
    const { error: insertErr } = await supabase.from("business_integrations").insert({
      business_id: businessId,
      provider_slug: "google_calendar",
      api_key: "oauth",
      api_secret: refreshToken,
      enabled: true,
    });
    if (insertErr) {
      console.error("Google Calendar callback: insert failed", insertErr);
      return NextResponse.redirect(`${returnUrl}&google_calendar=error&message=${encodeURIComponent("Failed to save connection")}`);
    }
  }

  return NextResponse.redirect(`${returnUrl}&google_calendar=success`);
}
