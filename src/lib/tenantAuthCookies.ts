import { parse, serialize } from 'cookie';
import { TENANT_AUTH_STORAGE_KEY } from '@/lib/auth-storage-keys';

/** When set, tenant auth cookies stay session-scoped (browser close) and stay that way on token refresh. */
export const TENANT_AUTH_SESSION_ONLY_KEY = 'tenant_auth_session_only';

export function setTenantAuthSessionOnlyMode(enabled: boolean): void {
  if (typeof window === 'undefined') return;
  if (enabled) {
    window.sessionStorage.setItem(TENANT_AUTH_SESSION_ONLY_KEY, '1');
  } else {
    window.sessionStorage.removeItem(TENANT_AUTH_SESSION_ONLY_KEY);
  }
}

export function isTenantAuthSessionOnlyMode(): boolean {
  if (typeof window === 'undefined') return false;
  return window.sessionStorage.getItem(TENANT_AUTH_SESSION_ONLY_KEY) === '1';
}

export function clearTenantAuthSessionOnlyMode(): void {
  if (typeof window === 'undefined') return;
  window.sessionStorage.removeItem(TENANT_AUTH_SESSION_ONLY_KEY);
}

/**
 * Re-write Supabase tenant auth cookies without Max-Age/Expires so they are session cookies
 * (cleared when the browser session ends). @supabase/ssr otherwise pins maxAge to ~400 days.
 */
export function reapplyTenantAuthCookiesAsSessionOnly(): void {
  if (typeof document === 'undefined') return;
  const parsed = parse(document.cookie);
  const base = TENANT_AUTH_STORAGE_KEY;
  const secure = process.env.NODE_ENV === 'production';

  for (const name of Object.keys(parsed)) {
    if (name !== base && !name.startsWith(`${base}.`)) continue;
    const value = parsed[name];
    if (value === undefined || value === '') continue;
    document.cookie = serialize(name, value, {
      path: '/',
      sameSite: 'lax',
      secure,
    });
  }
}
