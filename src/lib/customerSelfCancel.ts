import type { CancellationSettingsPayload } from '@/app/api/admin/cancellation-settings/route';

const SERVICE_CATEGORY_ID_KEYS = [
  'serviceCategoryId',
  'service_category_id',
  'selectedServiceId',
] as const;

export function resolveBookingServiceCategoryId(booking: {
  service_id?: string | null;
  customization?: unknown;
}): string | null {
  const fromColumn = String(booking.service_id ?? '').trim();
  if (fromColumn) return fromColumn;

  if (!booking.customization || typeof booking.customization !== 'object') return null;
  const customization = booking.customization as Record<string, unknown>;
  for (const key of SERVICE_CATEGORY_ID_KEYS) {
    const value = String(customization[key] ?? '').trim();
    if (value) return value;
  }
  return null;
}

export function getAllowedCustomerCancelCategoryIds(
  settings: Pick<CancellationSettingsPayload, 'customerCancelCategoryIds'>,
): string[] {
  const map = settings.customerCancelCategoryIds ?? {};
  return Object.entries(map)
    .filter(([, enabled]) => enabled === true)
    .map(([id]) => id);
}

export function isServiceCategoryAllowedForCustomerCancel(
  settings: Pick<CancellationSettingsPayload, 'customerCancelCategoryIds'>,
  serviceCategoryId: string | null | undefined,
): boolean {
  const allowedIds = getAllowedCustomerCancelCategoryIds(settings);
  if (allowedIds.length === 0) return false;
  if (!serviceCategoryId) return false;
  return allowedIds.includes(serviceCategoryId);
}

export const CUSTOMER_CANCEL_CATEGORY_BLOCKED_MESSAGE =
  'Online cancellation is not available for this service. Please contact the business to cancel your booking.';

export function assertCustomerCanCancelBooking(
  settings: CancellationSettingsPayload,
  booking: { service_id?: string | null; customization?: unknown },
): { ok: true } | { ok: false; error: string } {
  if (settings.allowCustomerSelfCancel === 'no') {
    return {
      ok: false,
      error:
        'Online cancellation is not available. Please contact the business to cancel your booking.',
    };
  }

  const serviceCategoryId = resolveBookingServiceCategoryId(booking);
  if (!isServiceCategoryAllowedForCustomerCancel(settings, serviceCategoryId)) {
    return { ok: false, error: CUSTOMER_CANCEL_CATEGORY_BLOCKED_MESSAGE };
  }

  return { ok: true };
}

export function canCustomerCancelBookingForCategory(
  allowedCategoryIds: string[] | null | undefined,
  booking: { serviceId?: string | null; service_id?: string | null; customization?: unknown },
): boolean {
  if (!allowedCategoryIds || allowedCategoryIds.length === 0) return false;
  const serviceCategoryId =
    String(booking.serviceId ?? booking.service_id ?? '').trim() ||
    resolveBookingServiceCategoryId(booking);
  if (!serviceCategoryId) return false;
  return allowedCategoryIds.includes(serviceCategoryId);
}
