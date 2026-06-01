import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { saveCustomerAuthorizeNetCard } from "@/lib/payments/saveCustomerAuthorizeNetCard";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

function getAdmin() {
  if (!supabaseUrl || !supabaseServiceKey) return null;
  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const token = typeof body.token === "string" ? body.token.trim() : "";
    const opaqueData = body.opaqueData as { dataDescriptor?: string; dataValue?: string } | undefined;

    if (!token) return NextResponse.json({ error: "token is required" }, { status: 400 });
    if (!opaqueData?.dataDescriptor || !opaqueData?.dataValue) {
      return NextResponse.json({ error: "opaqueData from Accept.js is required" }, { status: 400 });
    }

    const supabase = getAdmin();
    if (!supabase) return NextResponse.json({ error: "Server not configured" }, { status: 500 });

    const { data: link, error: linkErr } = await supabase
      .from("customer_add_card_links")
      .select("id, business_id, customer_id, expires_at, used_at")
      .eq("token", token)
      .single();

    if (linkErr || !link) return NextResponse.json({ error: "invalid_link" }, { status: 404 });
    if ((link as { used_at?: string | null }).used_at) {
      return NextResponse.json({ error: "link_used" }, { status: 409 });
    }

    const expiresAt = new Date((link as { expires_at: string }).expires_at);
    if (Date.now() > expiresAt.getTime()) {
      return NextResponse.json({ error: "link_expired" }, { status: 410 });
    }

    const businessId = (link as { business_id: string }).business_id;
    const customerId = (link as { customer_id: string }).customer_id;
    const linkId = (link as { id: string }).id;

    const { data: biz, error: bizErr } = await supabase
      .from("businesses")
      .select(
        "payment_provider, authorize_net_api_login_id, authorize_net_transaction_key, authorize_net_public_client_key"
      )
      .eq("id", businessId)
      .single();

    if (bizErr || !biz) return NextResponse.json({ error: "business_not_found" }, { status: 404 });

    const b = biz as {
      payment_provider?: string | null;
      authorize_net_api_login_id?: string | null;
      authorize_net_transaction_key?: string | null;
      authorize_net_public_client_key?: string | null;
    };

    if (b.payment_provider !== "authorize_net") {
      return NextResponse.json({ error: "authorize_net_not_enabled" }, { status: 400 });
    }

    const apiLoginId = b.authorize_net_api_login_id?.trim() || "";
    const transactionKey = b.authorize_net_transaction_key?.trim() || "";
    const publicClientKey = b.authorize_net_public_client_key?.trim() || "";

    if (!apiLoginId || !transactionKey || !publicClientKey) {
      return NextResponse.json({ error: "authorize_net_not_configured" }, { status: 500 });
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

    await supabase
      .from("customer_add_card_links")
      .update({ used_at: new Date().toISOString() })
      .eq("id", linkId);

    return NextResponse.json({
      ok: true,
      card: result.card,
      billingCards: result.billingCards,
      customerProfileId: result.customerProfileId,
    });
  } catch (e) {
    console.error("[authorize-net/customer-add-card/link]", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
