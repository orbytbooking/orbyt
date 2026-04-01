import type { SupabaseClient } from "@supabase/supabase-js";
import { EmailService } from "@/lib/emailService";
import { resolveProviderForCustomerBookingEmail } from "@/lib/bookingEmailProvider";

const BOOKING_ROW_SELECT_FOR_CUSTOMER_EMAIL =
  "id, status, customer_email, customer_name, service, scheduled_date, date, scheduled_time, time, address, total_price, exclude_customer_notification, provider_id, provider_name";

export type BookingRowForCustomerConfirmedEmail = {
  id: string;
  status?: string | null;
  customer_email?: string | null;
  customer_name?: string | null;
  service?: string | null;
  scheduled_date?: string | null;
  date?: string | null;
  scheduled_time?: string | null;
  time?: string | null;
  address?: string | null;
  total_price?: number | string | null;
  exclude_customer_notification?: boolean | null;
  provider_id?: string | null;
  provider_name?: string | null;
};

/**
 * Sends the customer-facing “booking confirmed” email when the row is confirmed.
 * Respects exclude_customer_notification and missing customer email.
 */
export async function sendCustomerBookingConfirmedEmail(
  supabase: SupabaseClient,
  businessId: string,
  booking: BookingRowForCustomerConfirmedEmail
): Promise<void> {
  if (booking.exclude_customer_notification) return;
  if (String(booking.status || "") !== "confirmed") return;
  const to = String(booking.customer_email ?? "").trim();
  if (!to) return;
  try {
    const { data: biz } = await supabase
      .from("businesses")
      .select("name, website, logo_url, business_email, business_phone, currency")
      .eq("id", businessId)
      .single();
    const emailService = new EmailService();
    const bkRef = `BK${String(booking.id).slice(-6).toUpperCase()}`;
    const { providerName, providerPhone } = await resolveProviderForCustomerBookingEmail(
      supabase,
      businessId,
      {
        provider_id: booking.provider_id ?? null,
        provider_name: booking.provider_name ?? null,
      }
    );
    await emailService.sendBookingConfirmedEmail({
      to,
      customerName: String(booking.customer_name ?? "").trim() || "Customer",
      businessName: biz?.name || "Your Business",
      businessWebsite: biz?.website || null,
      businessLogoUrl: biz?.logo_url || null,
      supportEmail: biz?.business_email || null,
      supportPhone: biz?.business_phone || null,
      storeCurrency: biz?.currency || null,
      service: booking.service ?? null,
      scheduledDate: (booking.scheduled_date ?? booking.date) ?? null,
      scheduledTime: (booking.scheduled_time ?? booking.time) ?? null,
      address: booking.address ?? null,
      totalPrice: Number(booking.total_price ?? 0),
      bookingRef: bkRef,
      providerName,
      providerPhone,
    });
  } catch (e) {
    console.warn("Customer booking confirmed email failed:", e);
  }
}

/**
 * After insert + processBookingScheduling (or Stripe materialize), load the latest row and email:
 * - `confirmed` → booking confirmation email only
 * - `pending` or `scheduled` (if ever stored) → pending / scheduled request email only (`booking_pending_request`)
 * - other statuses (e.g. in_progress, completed) → no email from this helper
 */
export async function sendCustomerFacingBookingEmailAfterScheduling(
  supabase: SupabaseClient,
  businessId: string,
  bookingId: string,
  opts: {
    totalPriceFallback: number;
    customerEmailFallback?: string | null;
    customerNameFallback?: string | null;
    awaitingOnlinePayment?: boolean;
  }
): Promise<void> {
  const { data: row } = await supabase
    .from("bookings")
    .select(BOOKING_ROW_SELECT_FOR_CUSTOMER_EMAIL)
    .eq("id", bookingId)
    .eq("business_id", businessId)
    .maybeSingle();

  if (!row || row.exclude_customer_notification) return;

  const to = String(row.customer_email ?? opts.customerEmailFallback ?? "").trim();
  if (!to) return;

  const st = String(row.status || "").toLowerCase();
  if (["draft", "quote", "expired", "cancelled"].includes(st)) return;

  if (st === "confirmed") {
    await sendCustomerBookingConfirmedEmail(supabase, businessId, row);
    return;
  }

  const pendingLike = st === "pending" || st === "scheduled";
  if (!pendingLike) return;

  try {
    const { data: biz } = await supabase
      .from("businesses")
      .select("name, website, logo_url, business_email, business_phone, currency")
      .eq("id", businessId)
      .single();
    const emailService = new EmailService();
    const bkRef = `BK${String(bookingId).slice(-6).toUpperCase()}`;
    const awaitingPay = opts.awaitingOnlinePayment ?? false;
    await emailService.sendBookingPendingEmail({
      to,
      customerName: String(row.customer_name ?? opts.customerNameFallback ?? "").trim() || "Customer",
      businessName: biz?.name || "Your Business",
      businessWebsite: biz?.website || null,
      businessLogoUrl: biz?.logo_url || null,
      supportEmail: biz?.business_email || null,
      supportPhone: biz?.business_phone || null,
      storeCurrency: biz?.currency || null,
      service: row.service ?? null,
      scheduledDate: (row.scheduled_date ?? row.date) ?? null,
      scheduledTime: (row.scheduled_time ?? row.time) ?? null,
      address: row.address ?? null,
      totalPrice: Number(row.total_price ?? opts.totalPriceFallback ?? 0),
      bookingRef: bkRef,
      awaitingOnlinePayment: awaitingPay,
      copyVariant: awaitingPay ? "pending" : "scheduled",
    });
  } catch (e) {
    console.warn("Customer booking pending email (post-scheduling) failed:", e);
  }
}
