import type { SupabaseClient, User } from "@supabase/supabase-js";
import {
  buildBookingLogMetadata,
  buildBookingLogSnapshot,
} from "./bookingLogSnapshot";
import {
  formatQuoteLogActorName,
  getRequestClientIp,
  insertQuoteActivityLog,
  shortBookingRefForLogs,
} from "./draftQuoteLogs";

export type BookingLogSource = "admin" | "reschedule form" | "customer portal" | "book now" | "automatic";

type BookingNameSource = {
  customer_name?: string | null;
};

export function resolveCustomerDisplayName(
  booking: BookingNameSource,
  fallback?: string | null
): string {
  const fromBooking = (booking.customer_name || "").trim();
  if (fromBooking) return fromBooking;
  const fb = (fallback || "").trim();
  if (fb) return fb;
  return "Customer";
}

export function formatBookingActivityText(
  bookingId: string,
  verb: string,
  customerName: string,
  actorName: string
): string {
  const ref = shortBookingRefForLogs(bookingId);
  return `#${ref} - ${verb} for ${customerName} by ${actorName}`;
}

export async function logBookingCreated(
  supabase: SupabaseClient,
  opts: {
    businessId: string;
    bookingId: string;
    customerName: string;
    actorName: string;
    actorUserId?: string | null;
    source?: BookingLogSource;
    automatic?: boolean;
    ipAddress?: string | null;
    booking?: Record<string, unknown> | null;
  }
): Promise<void> {
  const automatic = opts.automatic || opts.source === "automatic";
  const verb = automatic
    ? "automatic booking created"
    : opts.source === "book now"
      ? "booking created from book now"
      : "booking created";
  const actor = automatic ? "system" : opts.actorName;

  let metadata: BookingLogMetadata | null = null;
  if (opts.booking) {
    const current = await buildBookingLogSnapshot(supabase, opts.booking);
    metadata = {
      current,
      previous: null,
      recurring_series_id: typeof opts.booking.recurring_series_id === "string"
        ? opts.booking.recurring_series_id
        : null,
    };
  }

  await insertQuoteActivityLog(supabase, {
    business_id: opts.businessId,
    booking_id: opts.bookingId,
    actor_user_id: automatic ? null : opts.actorUserId ?? null,
    actor_name: automatic ? null : actor,
    activity_text: formatBookingActivityText(opts.bookingId, verb, opts.customerName, actor),
    event_key: "booking_created",
    ip_address: opts.ipAddress ?? null,
    metadata,
  });
}

export async function logBookingUpdated(
  supabase: SupabaseClient,
  opts: {
    businessId: string;
    bookingId: string;
    customerName: string;
    actorName: string;
    actorUserId?: string | null;
    source?: BookingLogSource;
    ipAddress?: string | null;
    bookingAfter?: Record<string, unknown> | null;
    bookingBefore?: Record<string, unknown> | null;
  }
): Promise<void> {
  let verb = "booking updated";
  if (opts.source === "reschedule form") verb = "booking updated from reschedule form";
  else if (opts.source === "customer portal") verb = "booking updated from customer portal";
  else if (opts.source === "book now") verb = "booking updated from book now";
  else if (opts.source === "admin") verb = "booking updated";

  let metadata: BookingLogMetadata | null = null;
  if (opts.bookingAfter) {
    metadata = await buildBookingLogMetadata(supabase, opts.bookingAfter, opts.bookingBefore);
  }

  await insertQuoteActivityLog(supabase, {
    business_id: opts.businessId,
    booking_id: opts.bookingId,
    actor_user_id: opts.actorUserId ?? null,
    actor_name: opts.actorName,
    activity_text: formatBookingActivityText(opts.bookingId, verb, opts.customerName, opts.actorName),
    event_key: "booking_updated",
    ip_address: opts.ipAddress ?? null,
    metadata,
  });
}

export async function logBookingCreatedFromAdminRequest(
  supabase: SupabaseClient,
  request: Request,
  user: User,
  businessId: string,
  booking: Record<string, unknown> & { id: string; customer_name?: string | null; status?: string | null },
  customerName?: string | null
): Promise<void> {
  const status = String(booking.status || "");
  if (status === "draft" || status === "quote") return;

  await logBookingCreated(supabase, {
    businessId,
    bookingId: booking.id,
    customerName: resolveCustomerDisplayName(booking, customerName),
    actorName: formatQuoteLogActorName(user),
    actorUserId: user.id,
    source: "admin",
    ipAddress: getRequestClientIp(request),
    booking: booking as Record<string, unknown>,
  });
}

export async function logBookingUpdatedFromAdminRequest(
  supabase: SupabaseClient,
  request: Request,
  user: User,
  businessId: string,
  bookingId: string,
  booking: BookingNameSource & Record<string, unknown>,
  fallbackCustomerName?: string | null,
  bookingBefore?: Record<string, unknown> | null
): Promise<void> {
  await logBookingUpdated(supabase, {
    businessId,
    bookingId,
    customerName: resolveCustomerDisplayName(booking, fallbackCustomerName),
    actorName: formatQuoteLogActorName(user),
    actorUserId: user.id,
    source: "admin",
    ipAddress: getRequestClientIp(request),
    bookingAfter: booking,
    bookingBefore: bookingBefore ?? null,
  });
}
