/** Client-safe tenant header for marketing admin API requests. */
export function marketingApiHeaders(businessId: string | null | undefined): Record<string, string> {
  const id = businessId?.trim();
  if (!id) return {};
  return { 'x-business-id': id };
}
