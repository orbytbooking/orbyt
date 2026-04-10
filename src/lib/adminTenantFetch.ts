/** Merge fetch init so admin APIs receive the active tenant and session cookies. */
export function withTenantBusiness(
  businessId: string | undefined | null,
  init: RequestInit = {}
): RequestInit {
  const headers = new Headers(init.headers ?? undefined);
  if (businessId?.trim()) {
    headers.set("x-business-id", businessId.trim());
  }
  return { credentials: "include", ...init, headers };
}
