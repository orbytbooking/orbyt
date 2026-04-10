/**
 * Per-user cache for admin shell light/dark so the first paint can match their saved profile
 * before /api/admin/profile returns. Database remains the source of truth after fetch.
 */
const key = (userId: string) => `orbyt-admin-theme:${userId}`;

export type AdminShellTheme = "light" | "dark";

export function adminThemeFromProfileValue(
  adminTheme: string | null | undefined
): AdminShellTheme {
  return adminTheme === "dark" ? "dark" : "light";
}

export function readCachedAdminTheme(userId: string): AdminShellTheme | null {
  if (typeof window === "undefined" || !userId) return null;
  try {
    const v = localStorage.getItem(key(userId));
    return v === "dark" || v === "light" ? v : null;
  } catch {
    return null;
  }
}

export function writeCachedAdminTheme(userId: string, theme: AdminShellTheme): void {
  if (typeof window === "undefined" || !userId) return;
  try {
    localStorage.setItem(key(userId), theme);
  } catch {
    /* quota / private mode */
  }
}
