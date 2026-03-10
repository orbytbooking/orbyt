import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser, createUnauthorizedResponse, createForbiddenResponse } from "@/lib/auth-helpers";
import { createClient } from "@supabase/supabase-js";

const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const SCOPES = ["https://www.googleapis.com/auth/calendar", "https://www.googleapis.com/auth/calendar.events"].join(" ");

/**
 * GET ?business=uuid
 * Redirects the user to Google OAuth consent for Calendar access.
 * State = base64(businessId) so callback can associate tokens with the business.
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) return createUnauthorizedResponse();

    const businessId = request.nextUrl.searchParams.get("business");
    if (!businessId) {
      return NextResponse.json({ error: "Business ID required" }, { status: 400 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const { data: business, error } = await supabase
      .from("businesses")
      .select("id, owner_id")
      .eq("id", businessId)
      .single();

    if (error || !business) {
      return NextResponse.json({ error: "Business not found" }, { status: 404 });
    }
    if ((business as { owner_id?: string }).owner_id !== user.id) {
      return createForbiddenResponse("You do not own this business");
    }

    const clientId = process.env.GOOGLE_CALENDAR_CLIENT_ID;
    const redirectUri = process.env.GOOGLE_CALENDAR_REDIRECT_URI;
    if (!clientId || !redirectUri) {
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin;
      const returnUrl = `${baseUrl}/admin/settings/general?tab=apps-integrations&google_calendar=error&message=${encodeURIComponent("Google Calendar is not configured. Add GOOGLE_CALENDAR_CLIENT_ID and GOOGLE_CALENDAR_REDIRECT_URI to your .env (see .env.example).")}`;
      return NextResponse.redirect(returnUrl);
    }

    const state = Buffer.from(JSON.stringify({ businessId })).toString("base64url");
    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: "code",
      scope: SCOPES,
      access_type: "offline",
      prompt: "consent",
      state,
    });

    const url = `${GOOGLE_AUTH_URL}?${params.toString()}`;
    return NextResponse.redirect(url);
  } catch (err) {
    console.error("Google Calendar connect:", err);
    return NextResponse.json({ error: "Failed to start Google Calendar connection" }, { status: 500 });
  }
}
