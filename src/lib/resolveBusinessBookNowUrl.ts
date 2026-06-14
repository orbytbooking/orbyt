/** Normalize app origin for links in emails (Resend, etc.). */
export function normalizeAppOrigin(raw?: string | null, fallbackOrigin?: string | null): string {
  let base =
    (raw ?? '').trim() ||
    (fallbackOrigin ?? '').trim() ||
    'http://localhost:3000';

  base = base.replace(/\/$/, '');

  if (/^https?:\/\//i.test(base)) {
    return base;
  }

  const isLocal =
    /^localhost(:\d+)?$/i.test(base) ||
    /^127\.0\.0\.1(:\d+)?$/i.test(base) ||
    /^\d{1,3}(\.\d{1,3}){3}(:\d+)?$/.test(base);

  return `${isLocal ? 'http' : 'https'}://${base}`;
}

export type ResolveBusinessBookNowUrlOptions = {
  /** Gift card code to pre-fill on book-now (optional). */
  giftCardCode?: string | null;
  /** Fallback when NEXT_PUBLIC_APP_URL is unset (e.g. request.nextUrl.origin). */
  requestOrigin?: string | null;
};

/** Customer-facing book-now URL for a tenant business. */
export function resolveBusinessBookNowUrl(
  businessId: string,
  options?: ResolveBusinessBookNowUrlOptions,
): string {
  const origin = normalizeAppOrigin(
    process.env.NEXT_PUBLIC_APP_URL,
    options?.requestOrigin,
  );

  const url = new URL('/book-now', `${origin}/`);
  url.searchParams.set('business', businessId);

  const code = options?.giftCardCode?.trim().toUpperCase();
  if (code) {
    url.searchParams.set('giftCard', code);
  }

  return url.toString();
}
