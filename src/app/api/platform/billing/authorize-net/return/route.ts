import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/auth-helpers";
import { completePlatformAuthorizeNetCheckout } from "@/lib/platform-billing/completePlatformAuthorizeNetCheckout";

export const dynamic = "force-dynamic";

function extractTransIdFromSearchParams(searchParams: URLSearchParams): string | null {
  const keys = ["transId", "trans_id", "transaction_id", "transactionId", "x_trans_id", "txn_id"];
  for (const k of keys) {
    const v = searchParams.get(k);
    if (v?.trim()) return v.trim();
  }
  return null;
}

function extractTransIdFromForm(body: Record<string, string>): string | null {
  const keys = ["transId", "trans_id", "transaction_id", "transactionId", "x_trans_id", "txn_id"];
  for (const k of keys) {
    const v = body[k];
    if (v?.trim()) return v.trim();
  }
  return null;
}

async function handle(request: NextRequest): Promise<NextResponse> {
  const admin = createServiceRoleClient();
  if (!admin) {
    return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
  }

  let transId = extractTransIdFromSearchParams(request.nextUrl.searchParams);

  if (!transId && request.method === "POST") {
    const ct = request.headers.get("content-type") ?? "";
    if (ct.includes("application/x-www-form-urlencoded")) {
      const text = await request.text();
      const params = new URLSearchParams(text);
      transId = extractTransIdFromSearchParams(params);
    } else if (ct.includes("application/json")) {
      try {
        const j = (await request.json()) as Record<string, unknown>;
        const flat: Record<string, string> = {};
        for (const [k, v] of Object.entries(j)) {
          if (typeof v === "string") flat[k] = v;
        }
        transId = extractTransIdFromForm(flat);
      } catch {
        /* ignore */
      }
    }
  }

  const appOrigin =
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") || request.nextUrl.origin;

  if (!transId) {
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"/><title>Payment</title></head><body>
<p>We could not read the payment confirmation from Authorize.Net. If you were charged, contact support with the time of payment.</p>
<p><a href="${appOrigin}/admin/settings/account?tab=billing">Back to billing</a></p>
</body></html>`;
    return new NextResponse(html, { status: 400, headers: { "Content-Type": "text/html; charset=utf-8" } });
  }

  const result = await completePlatformAuthorizeNetCheckout({
    supabase: admin,
    transId,
    appOrigin,
  });

  if (!result.ok) {
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"/><title>Payment</title></head><body>
<p>${escapeHtml(result.error)}</p>
<p><a href="${appOrigin}/admin/settings/account?tab=billing">Back to billing</a></p>
</body></html>`;
    return new NextResponse(html, {
      status: result.httpStatus ?? 500,
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  }

  return NextResponse.redirect(result.redirectUrl);
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export async function GET(request: NextRequest) {
  return handle(request);
}

export async function POST(request: NextRequest) {
  return handle(request);
}
