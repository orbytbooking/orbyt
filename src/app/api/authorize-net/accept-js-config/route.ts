import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import {
  createForbiddenResponse,
  createUnauthorizedResponse,
  getAuthenticatedUser,
} from "@/lib/auth-helpers";
import { getAcceptJsScriptUrl } from "@/lib/payments/authorizeNetMerchantApi";
import { resolveAuthorizeNetSessionCluster } from "@/lib/payments/authorizeNetEnvironment";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

function getAdmin() {
  if (!supabaseUrl || !supabaseServiceKey) return null;
  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

async function resolveBusinessFromToken(supabase: NonNullable<ReturnType<typeof getAdmin>>, token: string) {
  const { data: link, error: linkErr } = await supabase
    .from("customer_add_card_links")
    .select("business_id, expires_at, used_at")
    .eq("token", token)
    .single();

  if (linkErr || !link) return { error: "invalid_link" as const };
  if ((link as { used_at?: string | null }).used_at) return { error: "link_used" as const };

  const expiresAt = new Date((link as { expires_at: string }).expires_at);
  if (Date.now() > expiresAt.getTime()) return { error: "link_expired" as const };

  return { businessId: (link as { business_id: string }).business_id };
}

/** GET: Accept.js client config for a business (apiLoginId + public client key only). */
export async function GET(request: NextRequest) {
  try {
    const businessIdParam = request.nextUrl.searchParams.get("businessId")?.trim() || "";
    const token = request.nextUrl.searchParams.get("token")?.trim() || "";

    const supabase = getAdmin();
    if (!supabase) return NextResponse.json({ error: "Server not configured" }, { status: 500 });

    let businessId = businessIdParam;

    if (token) {
      const resolved = await resolveBusinessFromToken(supabase, token);
      if ("error" in resolved) {
        return NextResponse.json({ error: resolved.error }, { status: 404 });
      }
      businessId = resolved.businessId;
    } else {
      const user = await getAuthenticatedUser();
      if (!user) return createUnauthorizedResponse();
      if (user.user_metadata?.role === "customer") return createForbiddenResponse("Access denied");
      if (!businessId) {
        return NextResponse.json({ error: "businessId or token is required" }, { status: 400 });
      }

      const { data: biz, error: bizErr } = await supabase
        .from("businesses")
        .select("id, owner_id")
        .eq("id", businessId)
        .single();
      if (bizErr || !biz) return NextResponse.json({ error: "Business not found" }, { status: 404 });
      if ((biz as { owner_id?: string | null }).owner_id !== user.id) {
        return createForbiddenResponse("Access denied to this business");
      }
    }

    const { data: biz, error: bizErr } = await supabase
      .from("businesses")
      .select(
        "payment_provider, authorize_net_api_login_id, authorize_net_public_client_key, authorize_net_transaction_key, authorize_net_environment"
      )
      .eq("id", businessId)
      .single();

    if (bizErr || !biz) return NextResponse.json({ error: "Business not found" }, { status: 404 });

    const b = biz as {
      payment_provider?: string | null;
      authorize_net_api_login_id?: string | null;
      authorize_net_public_client_key?: string | null;
      authorize_net_transaction_key?: string | null;
      authorize_net_environment?: string | null;
    };

    if (b.payment_provider !== "authorize_net") {
      return NextResponse.json({ error: "Authorize.net is not enabled for this business" }, { status: 400 });
    }

    const apiLoginId = b.authorize_net_api_login_id?.trim() || "";
    const publicClientKey = b.authorize_net_public_client_key?.trim() || "";
    const hasTransactionKey = !!(b.authorize_net_transaction_key && b.authorize_net_transaction_key.trim());

    if (!apiLoginId || !hasTransactionKey) {
      return NextResponse.json(
        { error: "Authorize.net is not configured. Add API credentials in Billing settings." },
        { status: 400 }
      );
    }

    if (!publicClientKey) {
      return NextResponse.json(
        {
          error:
            "Authorize.net Public Client Key is missing. Add it in Billing settings (required for Accept.js card vaulting).",
        },
        { status: 400 }
      );
    }

    const cluster = resolveAuthorizeNetSessionCluster(b.authorize_net_environment);

    return NextResponse.json({
      apiLoginId,
      publicClientKey,
      acceptJsUrl: getAcceptJsScriptUrl(cluster),
      environment: cluster,
      businessId,
    });
  } catch (e) {
    console.error("[authorize-net/accept-js-config]", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
