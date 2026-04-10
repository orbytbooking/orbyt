import { ensureAbsoluteAppBase } from "@/lib/payments/authorizeNetEnvironment";

/**
 * Public base URL for this app (scheme + host, no trailing slash).
 * Used so Authorize.Net hostedPaymentReturnOptions always get absolute http(s) URLs — required even on localhost.
 */
export function resolveRequestAppBaseUrl(request: Request): string {
  const fromEnv = process.env.NEXT_PUBLIC_APP_URL?.replace(/\r/g, "").replace(/\/$/, "").trim();
  if (fromEnv) {
    return ensureAbsoluteAppBase(fromEnv);
  }

  const originHdr = request.headers.get("origin")?.replace(/\/$/, "").trim();
  if (originHdr) {
    return ensureAbsoluteAppBase(originHdr);
  }

  const referer = request.headers.get("referer");
  if (referer) {
    try {
      const u = new URL(referer);
      return ensureAbsoluteAppBase(`${u.protocol}//${u.host}`);
    } catch {
      /* ignore */
    }
  }

  const host = request.headers.get("x-forwarded-host") || request.headers.get("host");
  if (host) {
    const rawProto = request.headers.get("x-forwarded-proto") || "http";
    const proto = rawProto.split(",")[0].trim();
    return ensureAbsoluteAppBase(`${proto}://${host.trim()}`);
  }

  return ensureAbsoluteAppBase("");
}
