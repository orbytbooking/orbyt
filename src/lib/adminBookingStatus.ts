/**
 * Admin add-booking API: align booking status with assignment.
 * Pending is for unassigned; once a provider is set, default save becomes confirmed.
 */

export function providerIdFromBookingPayload(bookingData: Record<string, unknown>): string | null {
  const a = bookingData.service_provider_id;
  const b = bookingData.provider_id;
  const s = (
    a != null && String(a).trim() !== ''
      ? String(a)
      : b != null && String(b).trim() !== ''
        ? String(b)
        : ''
  ).trim();
  return s || null;
}

/**
 * Draft/quote unchanged. With provider: pending → confirmed; without provider: keep pending.
 */
export function finalStatusForAdminBooking(
  bookingData: Record<string, unknown>,
  providerId: string | null
): string {
  const raw = bookingData.status;
  const st = String(raw != null ? raw : 'pending').trim().toLowerCase();
  if (st === 'draft' || st === 'quote') {
    return st;
  }
  if (providerId) {
    if (st === 'pending') return 'confirmed';
    return String(raw != null && String(raw).trim() !== '' ? raw : 'confirmed');
  }
  return String(raw != null && String(raw).trim() !== '' ? raw : 'pending');
}
