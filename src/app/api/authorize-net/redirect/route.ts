import { NextRequest, NextResponse } from "next/server";
import { resolveHostedPaymentFormActionFromRedirectSearchParams } from "@/lib/payments/authorizeNetEnvironment";

/**
 * Accept Hosted requires POST to redirect. This route receives the token and
 * returns HTML that auto-posts to Authorize.net's payment form.
 * GET /api/authorize-net/redirect?token=xxx
 */
export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token");
  if (!token) {
    return new NextResponse("Missing token", { status: 400 });
  }

  const actionUrl = resolveHostedPaymentFormActionFromRedirectSearchParams(request.nextUrl.searchParams);

  const html = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>Redirecting to payment...</title></head>
<body>
  <p>Redirecting to secure payment...</p>
  <form id="authnet" method="POST" action="${actionUrl}">
    <input type="hidden" name="token" value="${token.replace(/"/g, "&quot;")}" />
  </form>
  <script src="/authorize-net-autopost.js" defer></script>
</body>
</html>`;

  return new NextResponse(html, {
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}
