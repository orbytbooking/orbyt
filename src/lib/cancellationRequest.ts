import type { CancellationSettingsPayload } from '@/app/api/admin/cancellation-settings/route';
import { isBookingRecurring } from '@/lib/cancellationReasons';

export type CancellationRequestStatus = 'pending' | 'approved' | 'rejected';

export function requiresAdminCancellationConfirm(
  settings: Pick<
    CancellationSettingsPayload,
    'adminConfirmCancellation' | 'adminConfirmCancellationScope'
  >,
  booking: { frequency?: string | null; recurring_series_id?: string | null }
): boolean {
  if (settings.adminConfirmCancellation !== 'yes') return false;
  const isRecurring = isBookingRecurring(booking);
  const scope = settings.adminConfirmCancellationScope ?? 'both';
  if (scope === 'both') return true;
  if (scope === 'one_time') return !isRecurring;
  if (scope === 'recurring') return isRecurring;
  return false;
}

export function hasPendingCancellationRequest(booking: {
  cancellation_request_status?: string | null;
  pending_cancellation_occurrence_dates?: string[] | null;
}): boolean {
  if (booking.cancellation_request_status === 'pending') return true;
  const pendingDates = booking.pending_cancellation_occurrence_dates;
  return Array.isArray(pendingDates) && pendingDates.length > 0;
}

export function isOccurrenceCancellationPending(
  booking: {
    cancellation_request_status?: string | null;
    pending_cancellation_occurrence_dates?: string[] | null;
  },
  occurrenceDate: string
): boolean {
  const d = occurrenceDate.slice(0, 10);
  const pendingDates = booking.pending_cancellation_occurrence_dates;
  return Array.isArray(pendingDates) && pendingDates.some((x) => String(x).slice(0, 10) === d);
}

export function isFullSeriesCancellationPending(booking: {
  cancellation_request_status?: string | null;
  status?: string | null;
}): boolean {
  return booking.cancellation_request_status === 'pending' && booking.status !== 'cancelled';
}
