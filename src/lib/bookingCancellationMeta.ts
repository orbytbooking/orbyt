export type BookingCancellationMeta = {
  reasonId?: string | null;
  reasonLabel?: string | null;
  comment?: string | null;
};

const CUSTOMIZATION_KEY = 'cancellationMeta';

export function readCancellationMetaFromBooking(booking: {
  cancellation_reason_id?: string | null;
  cancellation_reason_label?: string | null;
  cancellation_comment?: string | null;
  customization?: unknown;
}): BookingCancellationMeta {
  const fromColumns: BookingCancellationMeta = {
    reasonId: booking.cancellation_reason_id ?? null,
    reasonLabel: booking.cancellation_reason_label ?? null,
    comment: booking.cancellation_comment ?? null,
  };

  if (fromColumns.reasonLabel || fromColumns.comment || fromColumns.reasonId) {
    return fromColumns;
  }

  const cust =
    booking.customization && typeof booking.customization === 'object' && !Array.isArray(booking.customization)
      ? (booking.customization as Record<string, unknown>)
      : null;
  const stored = cust?.[CUSTOMIZATION_KEY];
  if (!stored || typeof stored !== 'object' || Array.isArray(stored)) {
    return fromColumns;
  }

  const meta = stored as Record<string, unknown>;
  return {
    reasonId: typeof meta.reasonId === 'string' ? meta.reasonId : null,
    reasonLabel: typeof meta.reasonLabel === 'string' ? meta.reasonLabel : null,
    comment: typeof meta.comment === 'string' ? meta.comment : null,
  };
}

export function mergeCancellationMetaIntoCustomization(
  existing: unknown,
  meta: BookingCancellationMeta
): Record<string, unknown> {
  const base =
    existing && typeof existing === 'object' && !Array.isArray(existing)
      ? { ...(existing as Record<string, unknown>) }
      : {};

  base[CUSTOMIZATION_KEY] = {
    reasonId: meta.reasonId ?? null,
    reasonLabel: meta.reasonLabel ?? null,
    comment: meta.comment ?? null,
  };

  return base;
}

export function isMissingCancellationColumnError(message: string | undefined): boolean {
  if (!message) return false;
  return (
    /cancellation_(reason|comment|request)|pending_cancellation_occurrence/i.test(message) &&
    /schema cache|column|does not exist/i.test(message)
  );
}
