import { ensureAbsoluteAppBase } from "@/lib/payments/authorizeNetEnvironment";

/**
 * Public base URL for this app (scheme + host, no trailing slash).
 * Used so Authorize.Net hostedPaymentReturnOptions always get absolute http(s) URLs — required even on localhost.
 *
 * Prefer the browser `Origin` (or Referer) over `NEXT_PUBLIC_APP_URL` so signup → checkout → return stays on the
 * same host the user actually used (e.g. localhost vs 127.0.0.1). Hosted return URLs are still normalized to
 * 127.0.0.1 where Authorize.Net rejects `localhost`.
 */
export function resolveRequestAppBaseUrl(request: Request): string {
  const originHdr = request.headers.get("origin")?.replace(/\/$/, "").trim();
  if (originHdr) {
    return ensureAbsoluteAppBase(originHdr);
  }

  const fromEnv = process.env.NEXT_PUBLIC_APP_URL?.replace(/\r/g, "").replace(/\/$/, "").trim();
  if (fromEnv) {
    return ensureAbsoluteAppBase(fromEnv);
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
