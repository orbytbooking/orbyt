export type OpenTimeLogRow = {
  booking_id: string;
  occurrence_date?: string | null;
  on_the_way_at?: string | null;
  at_location_at?: string | null;
  clocked_in_at?: string | null;
  provider_status?: string | null;
};

/** Normalize to YYYY-MM-DD so log keys match expanded occurrence dates (handles ISO timestamps from Postgres). */
export function normalizeBookingDateYmd(value: string | null | undefined): string {
  if (value == null) return '';
  const s = String(value).trim();
  if (!s) return '';
  const m = s.match(/^(\d{4}-\d{2}-\d{2})/);
  if (m) return m[1];
  const d = new Date(s);
  if (!Number.isNaN(d.getTime())) {
    const y = d.getUTCFullYear();
    const mo = String(d.getUTCMonth() + 1).padStart(2, '0');
    const da = String(d.getUTCDate()).padStart(2, '0');
    return `${y}-${mo}-${da}`;
  }
  return s.slice(0, 10);
}

/** Keys `bookingId|` (one-off) or `bookingId|YYYY-MM-DD` (recurring occurrence). */
export function collectActiveTimeLogKeys(logs: OpenTimeLogRow[] | null | undefined): Set<string> {
  const activeKeys = new Set<string>();
  for (const log of logs || []) {
    const ps = String(log.provider_status || '').toLowerCase();
    const midJobByStatus = ['on_the_way', 'at_location', 'clocked_in', 'lunch_break'].includes(ps);
    const midJobByTime = !!(log.on_the_way_at || log.at_location_at || log.clocked_in_at);
    if (!midJobByStatus && !midJobByTime) continue;
    const occ = normalizeBookingDateYmd(
      log.occurrence_date != null && String(log.occurrence_date).trim() ? String(log.occurrence_date) : '',
    );
    activeKeys.add(`${String(log.booking_id)}|${occ}`);
  }
  return activeKeys;
}

export function bookingRowHasActiveTimeLog(
  row: { id: string; date?: string; is_recurring?: boolean; occurrence_date?: string },
  activeKeys: Set<string>,
): boolean {
  const id = String(row.id);
  const dateStr = normalizeBookingDateYmd(row.date);
  if (dateStr && activeKeys.has(`${id}|${dateStr}`)) return true;
  if (!row.is_recurring) {
    return activeKeys.has(`${id}|`);
  }
  const occ = normalizeBookingDateYmd(row.occurrence_date ?? row.date);
  if (occ) {
    return activeKeys.has(`${id}|${occ}`);
  }
  const prefix = `${id}|`;
  for (const k of activeKeys) {
    if (k.startsWith(prefix) && k.length > prefix.length) return true;
  }
  if (activeKeys.has(`${id}|`)) return true;
  return false;
}

export function applyInProgressFromOpenTimeLogs<
  T extends { id: string; date?: string; is_recurring?: boolean; occurrence_date?: string; status: string },
>(rows: T[], activeKeys: Set<string>): T[] {
  return rows.map((row) => {
    if (row.status === 'completed' || row.status === 'cancelled') return row;
    if (!bookingRowHasActiveTimeLog(row, activeKeys)) return row;
    return { ...row, status: 'in_progress' };
  });
}

export function bookingHasAnyActiveTimeLogForBooking(bookingId: string, activeKeys: Set<string>): boolean {
  const prefix = `${String(bookingId)}|`;
  for (const k of activeKeys) {
    if (k.startsWith(prefix)) return true;
  }
  return false;
}

/**
 * Customer portal: combine expanded occurrence status, DB row status, and open provider time logs.
 * - Open log for this visit → in_progress.
 * - Recurring row `in_progress` with no open logs at all → in_progress everywhere (e.g. admin set status).
 * - Recurring row `in_progress` but some visit has an open log → only that visit is in_progress; others stay confirmed.
 */
export function resolveCustomerOccurrenceProgressStatus(params: {
  baseStatus: string;
  bookingId: string;
  occurrenceDateYmd: string;
  isRecurring: boolean;
  dbRowStatus: string | null | undefined;
  activeKeys: Set<string>;
}): string {
  const { baseStatus, bookingId, occurrenceDateYmd, isRecurring, dbRowStatus, activeKeys } = params;
  if (baseStatus === 'completed' || baseStatus === 'cancelled') return baseStatus;

  const rowForLog = {
    id: String(bookingId),
    date: occurrenceDateYmd,
    is_recurring: isRecurring,
    occurrence_date: isRecurring ? occurrenceDateYmd : undefined,
  };
  if (bookingRowHasActiveTimeLog(rowForLog, activeKeys)) return 'in_progress';

  const rowSt = String(dbRowStatus ?? '').toLowerCase();
  if (rowSt === 'in_progress') {
    if (isRecurring && bookingHasAnyActiveTimeLogForBooking(bookingId, activeKeys)) {
      return 'confirmed';
    }
    return 'in_progress';
  }

  return baseStatus;
}
