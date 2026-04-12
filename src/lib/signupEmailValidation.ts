/** Platform owner signup / pending-owner email format (shared client + API). */
export const SIGNUP_EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function normalizeOwnerSignupEmail(raw: string): string {
  return raw.trim().toLowerCase().replace(/[\u200b-\u200d\ufeff]/g, "");
}

export function isValidOwnerSignupEmail(normalized: string): boolean {
  return Boolean(normalized && SIGNUP_EMAIL_REGEX.test(normalized));
}
