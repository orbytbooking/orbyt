import type { CancellationSettingsPayload } from '@/app/api/admin/cancellation-settings/route';

export type CancellationReasonRecord = {
  id: string;
  label: string;
  display_order: number;
  is_active: boolean;
  applies_one_time: boolean;
  applies_recurring: boolean;
  applicable_cancel_all_recurring: boolean;
  applicable_cancel_single: boolean;
  applicable_exclude_cancellation_fee: boolean;
  applicable_exclude_after_first_fee: boolean;
};

export type CancelContext = {
  isRecurring: boolean;
  cancelScope: 'full' | 'single_occurrence';
  excludeCancellationFee: boolean;
  serviceCategoryId?: string | null;
};

export function isBookingRecurring(booking: {
  frequency?: string | null;
  recurring_series_id?: string | null;
}): boolean {
  const freq = String(booking.frequency ?? '')
    .toLowerCase()
    .replace(/\s+/g, ' ');
  if (freq && freq !== 'one-time' && freq !== 'onetime') return true;
  return !!booking.recurring_series_id;
}

function reasonMatchesApplicableOn(
  reason: CancellationReasonRecord,
  context: CancelContext
): boolean {
  const flags = [
    reason.applicable_cancel_all_recurring,
    reason.applicable_cancel_single,
    reason.applicable_exclude_cancellation_fee,
    reason.applicable_exclude_after_first_fee,
  ];
  if (!flags.some(Boolean)) return true;

  const matches: boolean[] = [];
  if (reason.applicable_cancel_all_recurring) {
    matches.push(context.isRecurring && context.cancelScope === 'full');
  }
  if (reason.applicable_cancel_single) {
    matches.push(context.cancelScope === 'single_occurrence');
  }
  if (reason.applicable_exclude_cancellation_fee) {
    matches.push(context.excludeCancellationFee);
  }
  if (reason.applicable_exclude_after_first_fee) {
    // Reserved for future fee-type detection; do not hide reasons solely on this flag yet.
    matches.push(false);
  }
  return matches.some(Boolean);
}

export function shouldShowReasonsForServiceCategory(
  serviceCategoryId: string | null | undefined,
  serviceReasonCategoryIds: Record<string, boolean> | undefined
): boolean {
  if (!serviceCategoryId) return true;
  const map = serviceReasonCategoryIds ?? {};
  const enabledIds = Object.entries(map).filter(([, v]) => v).map(([id]) => id);
  if (enabledIds.length === 0) return true;
  return enabledIds.includes(serviceCategoryId);
}

export function filterCancellationReasonsForCancel(
  reasons: CancellationReasonRecord[],
  context: CancelContext,
  settings: Pick<
    CancellationSettingsPayload,
    'cancellationServiceReasons' | 'cancellationReasonsSetup'
  >
): CancellationReasonRecord[] {
  if (settings.cancellationReasonsSetup === 'no') return [];

  if (
    !shouldShowReasonsForServiceCategory(
      context.serviceCategoryId,
      settings.cancellationServiceReasons
    )
  ) {
    return [];
  }

  return reasons
    .filter((r) => r.is_active)
    .filter((r) => (context.isRecurring ? r.applies_recurring : r.applies_one_time))
    .filter((r) => reasonMatchesApplicableOn(r, context))
    .sort((a, b) => a.display_order - b.display_order || a.label.localeCompare(b.label));
}

export function pickCancellationReasonFields(
  reason: CancellationReasonRecord | null | undefined
): { cancellation_reason_id: string | null; cancellation_reason_label: string | null } {
  if (!reason) {
    return { cancellation_reason_id: null, cancellation_reason_label: null };
  }
  return {
    cancellation_reason_id: reason.id,
    cancellation_reason_label: reason.label,
  };
}
