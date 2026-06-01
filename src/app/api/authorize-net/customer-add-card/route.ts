import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import {
  createForbiddenResponse,
  createUnauthorizedResponse,
  getAuthenticatedUser,
} from "@/lib/auth-helpers";
import { saveCustomerAuthorizeNetCard } from "@/lib/payments/saveCustomerAuthorizeNetCard";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

function getAdminSupabase() {
  if (!supabaseUrl || !supabaseServiceKey) return null;
  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) return createUnauthorizedResponse();
    if (user.user_metadata?.role === "customer") return createForbiddenResponse("Access denied");

    const body = await request.json().catch(() => ({}));
    const businessId = typeof body.businessId === "string" ? body.businessId.trim() : "";
    const customerId = typeof body.customerId === "string" ? body.customerId.trim() : "";
    const opaqueData = body.opaqueData as { dataDescriptor?: string; dataValue?: string } | undefined;

    if (!businessId || !customerId) {
      return NextResponse.json({ error: "businessId and customerId are required" }, { status: 400 });
    }
    if (!opaqueData?.dataDescriptor || !opaqueData?.dataValue) {
      return NextResponse.json({ error: "opaqueData from Accept.js is required" }, { status: 400 });
    }

    const supabase = getAdminSupabase();
    if (!supabase) {
      return NextResponse.json({ error: "Server not configured" }, { status: 500 });
    }

    const { data: biz, error: bizErr } = await supabase
      .from("businesses")
      .select(
        "id, owner_id, payment_provider, authorize_net_api_login_id, authorize_net_transaction_key, authorize_net_public_client_key"
      )
      .eq("id", businessId)
      .single();

    if (bizErr || !biz) return NextResponse.json({ error: "Business not found" }, { status: 404 });
    if ((biz as { owner_id?: string | null }).owner_id !== user.id) {
      return createForbiddenResponse("Access denied to this business");
    }

    const b = biz as {
      payment_provider?: string | null;
      authorize_net_api_login_id?: string | null;
      authorize_net_transaction_key?: string | null;
      authorize_net_public_client_key?: string | null;
    };

    if (b.payment_provider !== "authorize_net") {
      return NextResponse.json(
        { error: "Authorize.net is not enabled for this business" },
        { status: 400 }
      );
    }

    const apiLoginId = b.authorize_net_api_login_id?.trim() || "";
    const transactionKey = b.authorize_net_transaction_key?.trim() || "";
    const publicClientKey = b.authorize_net_public_client_key?.trim() || "";

    if (!apiLoginId || !transactionKey) {
      return NextResponse.json(
        { error: "Authorize.net is not configured. Add credentials in Billing settings." },
        { status: 400 }
      );
    }
    if (!publicClientKey) {
      return NextResponse.json(
        {
          error:
            "Authorize.net Public Client Key is missing. Add it in Billing settings (required for Accept.js).",
        },
        { status: 400 }
      );
    }

    const result = await saveCustomerAuthorizeNetCard(supabase, {
      businessId,
      customerId,
      creds: { apiLoginId, transactionKey },
      opaqueData: {
        dataDescriptor: opaqueData.dataDescriptor,
        dataValue: opaqueData.dataValue,
      },
    });

    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }

    return NextResponse.json({
      ok: true,
      card: result.card,
      billingCards: result.billingCards,
      customerProfileId: result.customerProfileId,
    });
  } catch (e) {
    console.error("[authorize-net/customer-add-card]", e);
    const msg = e instanceof Error ? e.message : "Internal server error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
