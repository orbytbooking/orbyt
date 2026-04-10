/**
 * Client-side fallback cache for admin customer list (and detail fallback when API fails).
 * Keys are scoped by business so switching tenant does not read another business's data.
 */
export const ADMIN_CUSTOMERS_LEGACY_KEY = 'adminCustomers';

/** Map of customerId → extras blob; legacy key was global */
export const ADMIN_CUSTOMER_EXTRAS_LEGACY_KEY = 'adminCustomerExtras';

export function adminCustomersStorageKey(businessId: string | null | undefined): string {
  const id = businessId?.trim();
  if (id) return `${ADMIN_CUSTOMERS_LEGACY_KEY}_${id}`;
  return ADMIN_CUSTOMERS_LEGACY_KEY;
}

export function adminCustomerExtrasStorageKey(businessId: string | null | undefined): string {
  const id = businessId?.trim();
  if (id) return `${ADMIN_CUSTOMER_EXTRAS_LEGACY_KEY}_${id}`;
  return ADMIN_CUSTOMER_EXTRAS_LEGACY_KEY;
}

/** Read JSON customer array: scoped key first, then legacy global key when businessId is set. */
export function getStoredAdminCustomersJson(businessId: string | null | undefined): string | null {
  if (typeof window === 'undefined') return null;
  const key = adminCustomersStorageKey(businessId);
  let raw = localStorage.getItem(key);
  if (!raw && businessId) {
    raw = localStorage.getItem(ADMIN_CUSTOMERS_LEGACY_KEY);
  }
  return raw;
}

export function getStoredAdminCustomerExtrasJson(businessId: string | null | undefined): string | null {
  if (typeof window === 'undefined') return null;
  const key = adminCustomerExtrasStorageKey(businessId);
  let raw = localStorage.getItem(key);
  if (!raw && businessId) {
    raw = localStorage.getItem(ADMIN_CUSTOMER_EXTRAS_LEGACY_KEY);
  }
  return raw;
}

/** Pass on admin customer API requests so the route can assert tenant context. */
export function adminCustomerApiHeaders(businessId: string | null | undefined): Record<string, string> {
  const id = businessId?.trim();
  if (!id) return {};
  return { 'x-business-id': id };
}
