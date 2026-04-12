import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/auth-helpers";
import { completePlatformAuthorizeNetCheckout } from "@/lib/platform-billing/completePlatformAuthorizeNetCheckout";
import { ensureAbsoluteAppBase } from "@/lib/payments/authorizeNetEnvironment";
import { resolveTransIdForPlatformCheckoutSession } from "@/lib/platform-billing/authorizeNetPlatformApi";

export const dynamic = "force-dynamic";
/** Allow polling Authorize.Net reporting when `transId` is missing from redirect (can lag several seconds). */
export const maxDuration = 60;

/** Accept Hosted may send the transaction id under several names (GET query or POST body). */
const TRANS_ID_KEYS = [
  "transId",
  "trans_id",
  "transaction_id",
  "transactionId",
  "TransactionID",
  "TRANSACTION_ID",
  "transactionID",
  "x_trans_id",
  "X_TRANS_ID",
  "txn_id",
  "refTransID",
  "ref_trans_id",
  "paymentTransactionId",
  "payment_trans_id",
];

function extractTransIdFromSearchParams(searchParams: URLSearchParams): string | null {
  for (const k of TRANS_ID_KEYS) {
    const v = searchParams.get(k) ?? searchParams.get(k.toLowerCase());
    if (v?.trim()) return v.trim();
  }
  return null;
}

function extractTransIdFromForm(body: Record<string, string>): string | null {
  const lowerMap = new Map<string, string>();
  for (const [k, v] of Object.entries(body)) {
    lowerMap.set(k.toLowerCase(), v);
  }
  for (const k of TRANS_ID_KEYS) {
    const v = body[k] ?? lowerMap.get(k.toLowerCase());
    if (v?.trim()) return v.trim();
  }
  for (const v of Object.values(body)) {
    const t = v?.trim();
    if (!t || t.length < 2) continue;
    if (t.startsWith("{") && t.includes("transId")) {
      try {
        const j = JSON.parse(t) as Record<string, unknown>;
        const nested =
          (j.transId as string) ||
          (j.trans_id as string) ||
          ((j.transaction as Record<string, unknown> | undefined)?.transId as string);
        if (nested && String(nested).trim()) return String(nested).trim();
      } catch {
        /* ignore */
      }
    }
  }
  return null;
}

function extractTransIdFromFormData(fd: FormData): string | null {
  const flat: Record<string, string> = {};
  for (const [k, v] of fd.entries()) {
    if (typeof v === "string" && v.trim()) flat[k] = v;
  }
  return extractTransIdFromForm(flat);
}

async function handle(request: NextRequest): Promise<NextResponse> {
  const admin = createServiceRoleClient();
  if (!admin) {
    return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
  }

  /** Same host the user hit for this return — keeps signup → complete on localhost vs 127.0.0.1 consistent. */
  const appOrigin = ensureAbsoluteAppBase(
    request.nextUrl.origin?.replace(/\/$/, "").trim() ||
      process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "").trim() ||
      ""
  );

  let transId = extractTransIdFromSearchParams(request.nextUrl.searchParams);
  const checkoutSessionToken = request.nextUrl.searchParams.get("s")?.trim() || null;

  if (!transId && request.method === "POST") {
    const ct = (request.headers.get("content-type") ?? "").toLowerCase();
    if (ct.includes("application/json")) {
      try {
        const j = (await request.json()) as Record<string, unknown>;
        const flat: Record<string, string> = {};
        for (const [k, v] of Object.entries(j)) {
          if (typeof v === "string") flat[k] = v;
        }
        transId = extractTransIdFromForm(flat);
        if (!transId) {
          console.error("[Platform Authorize.Net] return POST JSON: missing transId; keys:", Object.keys(flat));
        }
      } catch {
        /* ignore */
      }
    } else {
      try {
        const fd = await request.formData();
        transId = extractTransIdFromFormData(fd);
        if (!transId) {
          console.error(
            "[Platform Authorize.Net] return POST form: missing transId; keys:",
            [...fd.keys()].slice(0, 50)
          );
        }
      } catch (e) {
        console.error("[Platform Authorize.Net] return POST formData parse:", e);
      }
    }
  }

  if (!transId && checkoutSessionToken) {
    try {
      transId = await resolveTransIdForPlatformCheckoutSession(checkoutSessionToken);
      if (transId) {
        console.log(
          "[Platform Authorize.Net] return: resolved transId via reporting (invoice = session)",
          checkoutSessionToken.slice(0, 8)
        );
      }
    } catch (e) {
      console.error("[Platform Authorize.Net] return: reporting lookup failed:", e);
    }
  }

  if (!transId) {
    console.error(
      "[Platform Authorize.Net] return: missing transaction id. Method:",
      request.method,
      "query keys:",
      [...request.nextUrl.searchParams.keys()],
      "hadSessionParam:",
      Boolean(checkoutSessionToken)
    );
    const retryHint = checkoutSessionToken
      ? "<p>This page already waited and polled Authorize.Net for your transaction. If you just paid, <strong>refresh once</strong> after a short wait — reporting can still lag in rare cases.</p>"
      : "";
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"/><title>Payment</title></head><body>
<p>We could not read the payment confirmation from Authorize.Net. If you were charged, contact support with the time of payment and your email.</p>
${retryHint}
<p><a href="${appOrigin}/auth/onboarding">Back to onboarding</a></p>
<p><a href="${appOrigin}/admin/settings/account?tab=billing">Back to billing</a></p>
</body></html>`;
    return new NextResponse(html, { status: 400, headers: { "Content-Type": "text/html; charset=utf-8" } });
  }

  const result = await completePlatformAuthorizeNetCheckout({
    supabase: admin,
    transId,
    appOrigin,
  });

  if (result.ok === false) {
    const { error, httpStatus } = result;
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"/><title>Payment</title></head><body>
<p>${escapeHtml(error)}</p>
<p><a href="${appOrigin}/auth/onboarding">Back to onboarding</a></p>
<p><a href="${appOrigin}/admin/settings/account?tab=billing">Back to billing</a></p>
</body></html>`;
    return new NextResponse(html, {
      status: httpStatus ?? 500,
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
