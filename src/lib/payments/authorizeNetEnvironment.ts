const AUTHORIZE_NET_SANDBOX_API = "https://apitest.authorize.net/xml/v1/request.api";
const AUTHORIZE_NET_PROD_API = "https://api.authorize.net/xml/v1/request.api";

/** Accept Hosted form POST target (must match API environment — token from sandbox API is invalid on production host). */
const AUTHORIZE_NET_SANDBOX_PAYMENT_FORM = "https://test.authorize.net/payment/payment";
const AUTHORIZE_NET_PROD_PAYMENT_FORM = "https://accept.authorize.net/payment/payment";

/** Sandbox unless AUTHORIZE_NET_ENVIRONMENT=production */
export function getAuthorizeNetApiUrl(): string {
  return process.env.AUTHORIZE_NET_ENVIRONMENT === "production" ? AUTHORIZE_NET_PROD_API : AUTHORIZE_NET_SANDBOX_API;
}

/** Which Authorize.Net cluster issued / validates the hosted payment token (API + form host must match). */
export type AuthorizeNetSessionCluster = "sandbox" | "production";

export function getAuthorizeNetSessionCluster(): AuthorizeNetSessionCluster {
  return process.env.AUTHORIZE_NET_ENVIRONMENT === "production" ? "production" : "sandbox";
}

/** URL for POSTing the hosted payment token (see Accept Hosted docs). */
export function getAuthorizeNetHostedPaymentFormUrl(): string {
  return getAuthorizeNetSessionCluster() === "production"
    ? AUTHORIZE_NET_PROD_PAYMENT_FORM
    : AUTHORIZE_NET_SANDBOX_PAYMENT_FORM;
}

/**
 * Redirect handler: prefer `anet_env` from the URL (set when the token was minted) so sandbox tokens still work
 * if NEXT_PUBLIC_APP_URL points at production but checkout ran locally with sandbox keys.
 */
export function resolveHostedPaymentFormActionFromRedirectSearchParams(searchParams: URLSearchParams): string {
  const raw = searchParams.get("anet_env")?.trim().toLowerCase();
  if (raw === "sandbox" || raw === "test") {
    return AUTHORIZE_NET_SANDBOX_PAYMENT_FORM;
  }
  if (raw === "production" || raw === "live") {
    return AUTHORIZE_NET_PROD_PAYMENT_FORM;
  }
  return getAuthorizeNetHostedPaymentFormUrl();
}

/**
 * Authorize.Net may echo order text into hosted payment pages; strip characters that can break inline scripts.
 */
export function sanitizeAuthorizeNetOrderText(raw: string, maxLen: number): string {
  const s = raw.normalize("NFKD").replace(/[\u0300-\u036f]/g, "");
  const ascii = s.replace(/[^\x20-\x7E]/g, " ");
  const noBreak = ascii.replace(/["'\\\r\n\u2028\u2029]/g, " ");
  /** Avoid chars that could break if echoed into HTML/JS on the gateway-hosted page. */
  const safe = noBreak.replace(/[<>&`]/g, " ");
  return safe.replace(/\s+/g, " ").trim().slice(0, maxLen);
}

function stripEnvNoise(s: string): string {
  return s
    .replace(/^\uFEFF/, "")
    .replace(/\r/g, "")
    .trim()
    .replace(/^["']|["']$/g, "")
    .trim();
}

/**
 * Accept Hosted hostedPaymentReturnOptions: `url` and `cancelUrl` must start with http:// or https://
 * (relative URLs and hostnames without a scheme are rejected).
 */
export function ensureAbsoluteAppBase(raw: string | undefined | null): string {
  let u = stripEnvNoise(raw ?? "");
  u = u.replace(/\/$/, "");
  if (!u) {
    u = "http://localhost:3000";
  }
  if (u.startsWith("http://") || u.startsWith("https://")) {
    return u;
  }
  const lower = u.toLowerCase();
  if (lower.startsWith("localhost") || lower.startsWith("127.0.0.1") || lower.startsWith("[::1]")) {
    return `http://${u}`;
  }
  return `https://${u}`;
}

/**
 * Sandbox/production Accept Hosted rejects `http://localhost` / `::1` in hostedPaymentReturnOptions (misleading
 * "must begin with http://" error). Same machine works with 127.0.0.1.
 */
export function normalizeUrlForAuthorizeNetHostedReturn(u: string): string {
  try {
    const parsed = new URL(u);
    const h = parsed.hostname.toLowerCase();
    if (h === "localhost") {
      parsed.hostname = "127.0.0.1";
      return parsed.href;
    }
    if (h === "::1" || h === "[::1]") {
      parsed.hostname = "127.0.0.1";
      return parsed.href;
    }
  } catch {
    /* keep original */
  }
  return u;
}

/** Resolve a full URL or root-relative path against the app base (both must be absolute for Authorize.Net). */
export function toAbsoluteHostedPaymentUrl(baseApp: string, urlOrPath: string): string {
  const t = stripEnvNoise(urlOrPath);
  if (t.startsWith("http://") || t.startsWith("https://")) {
    try {
      return new URL(t).href;
    } catch {
      return t;
    }
  }
  const b = ensureAbsoluteAppBase(baseApp).replace(/\/$/, "");
  const path = t.startsWith("/") ? t : `/${t}`;
  try {
    return new URL(path, `${b}/`).href;
  } catch {
    return `${b}${path}`;
  }
}

/**
 * Accept Hosted embeds return/cancel URLs in the payment page; URLs whose query string contains `&`
 * often break their page (blank form, CSP/script errors). Use a single query param or no query.
 * @see https://stackoverflow.com/questions/56113493/accepted-host-form-does-not-display
 */
export function cancelUrlSafeForAuthorizeNetAcceptHosted(
  cancelAbsolute: string,
  fallbackAmpersandFree: string
): string {
  const u = cancelAbsolute.trim();
  if (!u.includes("&")) return u;
  console.warn(
    "[Authorize.Net Accept Hosted] cancelUrl contained '&' — using ampersand-free fallback so the hosted page can render."
  );
  return fallbackAmpersandFree.trim();
}

