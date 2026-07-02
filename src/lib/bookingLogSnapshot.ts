import type { SupabaseClient } from "@supabase/supabase-js";

export type BookingLogSnapshot = {
  customer_name: string | null;
  customer_email: string | null;
  customer_phone: string | null;
  sms_reminders: boolean | null;
  apt_no: string | null;
  address: string | null;
  zip_code: string | null;
  scheduled_date: string | null;
  scheduled_time: string | null;
  service: string | null;
  status: string | null;
  payment_method: string | null;
  frequency: string | null;
  notes: string | null;
  total_price: string | null;
  provider_name: string | null;
};

export type BookingLogMetadata = {
  current: BookingLogSnapshot | null;
  previous: BookingLogSnapshot | null;
  recurring_series_id: string | null;
};

export type BookingLogSummaryField = {
  key: keyof BookingLogSnapshot;
  label: string;
  format?: "checkbox" | "text";
};

export const BOOKING_LOG_SUMMARY_FIELDS: BookingLogSummaryField[] = [
  { key: "customer_name", label: "Customer name" },
  { key: "customer_email", label: "Email" },
  { key: "customer_phone", label: "Phone no" },
  { key: "sms_reminders", label: "Send me reminders about my booking via text message", format: "checkbox" },
  { key: "apt_no", label: "Apt" },
  { key: "address", label: "Location" },
  { key: "scheduled_date", label: "Service date" },
  { key: "scheduled_time", label: "Service time" },
  { key: "service", label: "Service" },
  { key: "status", label: "Status" },
  { key: "payment_method", label: "Payment method" },
  { key: "frequency", label: "Frequency" },
  { key: "provider_name", label: "Provider" },
  { key: "total_price", label: "Total price" },
  { key: "notes", label: "Notes" },
];

function str(v: unknown): string | null {
  if (v == null) return null;
  const s = String(v).trim();
  return s || null;
}

function formatTimeDisplay(time: string | null): string | null {
  if (!time) return null;
  const m = time.match(/^(\d{1,2}):(\d{2})/);
  if (!m) return time;
  let h = parseInt(m[1], 10);
  const min = m[2];
  const ampm = h >= 12 ? "PM" : "AM";
  h = h % 12 || 12;
  return `${h}:${min} ${ampm}`;
}

export function bookingToLogSnapshot(
  booking: Record<string, unknown>,
  smsReminders?: boolean | null
): BookingLogSnapshot {
  const date = str(booking.scheduled_date ?? booking.date);
  const time = formatTimeDisplay(str(booking.scheduled_time ?? booking.time));
  const priceRaw = booking.total_price ?? booking.amount;
  const price =
    priceRaw == null || priceRaw === ""
      ? null
      : typeof priceRaw === "number"
        ? priceRaw.toFixed(2)
        : str(priceRaw);

  return {
    customer_name: str(booking.customer_name),
    customer_email: str(booking.customer_email),
    customer_phone: str(booking.customer_phone),
    sms_reminders: smsReminders ?? null,
    apt_no: str(booking.apt_no),
    address: str(booking.address),
    zip_code: str(booking.zip_code),
    scheduled_date: date,
    scheduled_time: time,
    service: str(booking.service),
    status: str(booking.status),
    payment_method: str(booking.payment_method),
    frequency: str(booking.frequency),
    notes: str(booking.notes),
    total_price: price,
    provider_name: str(booking.provider_name),
  };
}

export async function buildBookingLogSnapshot(
  supabase: SupabaseClient,
  booking: Record<string, unknown>
): Promise<BookingLogSnapshot> {
  let smsReminders: boolean | null = null;
  const customerId = str(booking.customer_id);
  if (customerId) {
    const { data } = await supabase
      .from("customers")
      .select("sms_reminders")
      .eq("id", customerId)
      .maybeSingle();
    if (data) smsReminders = (data as { sms_reminders?: boolean }).sms_reminders !== false;
  }
  return bookingToLogSnapshot(booking, smsReminders);
}

export async function buildBookingLogMetadata(
  supabase: SupabaseClient,
  bookingAfter: Record<string, unknown>,
  bookingBefore?: Record<string, unknown> | null
): Promise<BookingLogMetadata> {
  const current = await buildBookingLogSnapshot(supabase, bookingAfter);
  const previous = bookingBefore ? await buildBookingLogSnapshot(supabase, bookingBefore) : null;
  const recurringSeriesId = str(bookingAfter.recurring_series_id);
  return {
    current,
    previous,
    recurring_series_id: recurringSeriesId,
  };
}

export function formatSnapshotValue(
  key: keyof BookingLogSnapshot,
  value: string | boolean | null | undefined,
  format?: "checkbox" | "text"
): string {
  if (format === "checkbox") {
    if (value === true) return "Yes";
    if (value === false) return "No";
    return "—";
  }
  if (value == null || value === "") return "—";
  return String(value);
}

export const BOOKING_LOG_DETAIL_PRIMARY_FIELDS: BookingLogSummaryField[] = [
  { key: "customer_name", label: "Customer name" },
  { key: "customer_email", label: "Email" },
  { key: "customer_phone", label: "Phone no" },
  {
    key: "sms_reminders",
    label: "Send me reminders about my booking via text message",
    format: "checkbox",
  },
  { key: "apt_no", label: "Apt" },
  { key: "address", label: "Location" },
];

export function snapshotFieldValuesEqual(
  key: keyof BookingLogSnapshot,
  a: BookingLogSnapshot | null | undefined,
  b: BookingLogSnapshot | null | undefined,
  format?: "checkbox" | "text"
): boolean {
  return (
    formatSnapshotValue(key, a?.[key], format) === formatSnapshotValue(key, b?.[key], format)
  );
}

export function snapshotFieldChanged(
  key: keyof BookingLogSnapshot,
  current: BookingLogSnapshot | null | undefined,
  previous: BookingLogSnapshot | null | undefined,
  format?: "checkbox" | "text"
): boolean {
  if (!previous || !current) return false;
  return !snapshotFieldValuesEqual(key, current, previous, format);
}

export function snapshotHasAnyData(snapshot: BookingLogSnapshot | null | undefined): boolean {
  if (!snapshot) return false;
  return BOOKING_LOG_SUMMARY_FIELDS.some((f) => {
    const v = snapshot[f.key];
    return v != null && v !== "";
  });
}

export function snapshotHasPreviousChanges(
  current: BookingLogSnapshot | null | undefined,
  previous: BookingLogSnapshot | null | undefined
): boolean {
  if (!previous || !current) return false;
  return BOOKING_LOG_SUMMARY_FIELDS.some((field) =>
    snapshotFieldChanged(field.key, current, previous, field.format)
  );
}
