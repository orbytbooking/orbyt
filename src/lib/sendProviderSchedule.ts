import type { SupabaseClient } from "@supabase/supabase-js";
import { Resend } from "resend";
import {
  ensureSendScheduleNotificationTemplate,
  SEND_SCHEDULE_TEMPLATE_NAME,
} from "@/lib/businessNotificationTemplates";
import { substituteEmailPlaceholders, resolvePublicAssetUrls } from "@/lib/emailTemplatePlaceholders";
import { sendSmsViaTwilio } from "@/lib/smsService";

export type ScheduleBookingRow = {
  id: string;
  provider_id: string | null;
  customer_name: string | null;
  customer_email: string | null;
  service: string | null;
  scheduled_date: string | null;
  date: string | null;
  scheduled_time: string | null;
  time: string | null;
  address: string | null;
  total_price: number | string | null;
  status: string | null;
  provider_name: string | null;
};

export type SendProviderScheduleResult = {
  providersNotified: number;
  emailsSent: number;
  smsSent: number;
  bookingsUpdated: number;
  skipped: { bookingId: string; reason: string }[];
  warnings: string[];
};

function formatScheduleDate(dateStr: string | null): string {
  if (!dateStr) return "TBD";
  const d = new Date(`${dateStr}T00:00:00`);
  if (Number.isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" });
}

function formatScheduleTime(timeStr: string | null): string {
  if (!timeStr) return "";
  const s = String(timeStr);
  return s.includes(":") ? s.slice(0, 5) : s;
}

function bookingDate(b: ScheduleBookingRow): string {
  return String(b.scheduled_date ?? b.date ?? "").trim();
}

function bookingTime(b: ScheduleBookingRow): string {
  return String(b.scheduled_time ?? b.time ?? "").trim();
}

function formatMoney(amount: number | string | null | undefined, currency: string): string {
  const num = typeof amount === "number" ? amount : parseFloat(String(amount ?? "0"));
  const n = Number.isFinite(num) ? num : 0;
  try {
    return new Intl.NumberFormat("en-US", { style: "currency", currency: currency || "USD" }).format(n);
  } catch {
    return `$${n.toFixed(2)}`;
  }
}

export function buildProviderScheduleTableHtml(bookings: ScheduleBookingRow[], currency: string): string {
  const sorted = [...bookings].sort((a, b) => {
    const dc = bookingDate(a).localeCompare(bookingDate(b));
    if (dc !== 0) return dc;
    return bookingTime(a).localeCompare(bookingTime(b));
  });

  const rows = sorted
    .map((b) => {
      const ref = `BK${String(b.id).slice(-6).toUpperCase()}`;
      return `<tr>
<td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;">${formatScheduleDate(bookingDate(b))}</td>
<td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;">${formatScheduleTime(bookingTime(b)) || "—"}</td>
<td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;">${escapeHtml(b.customer_name || "Customer")}</td>
<td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;">${escapeHtml(b.service || "Service")}</td>
<td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;">${escapeHtml(b.address || "")}</td>
<td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;text-align:right;">${formatMoney(b.total_price, currency)}</td>
<td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;font-size:12px;color:#6b7280;">${ref}</td>
</tr>`;
    })
    .join("");

  return `<div style="margin:16px 0;">
<p style="margin:0 0 12px;font-size:15px;">You have <strong>${sorted.length}</strong> booking(s) in this period:</p>
<table style="width:100%;border-collapse:collapse;font-size:14px;">
<thead>
<tr style="background:#f3f4f6;text-align:left;">
<th style="padding:10px 12px;">Date</th>
<th style="padding:10px 12px;">Time</th>
<th style="padding:10px 12px;">Customer</th>
<th style="padding:10px 12px;">Service</th>
<th style="padding:10px 12px;">Location</th>
<th style="padding:10px 12px;text-align:right;">Price</th>
<th style="padding:10px 12px;">Ref</th>
</tr>
</thead>
<tbody>${rows}</tbody>
</table>
</div>`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function buildScheduleSmsBody(
  providerName: string,
  businessName: string,
  startDate: string,
  endDate: string,
  bookings: ScheduleBookingRow[],
): string {
  const lines = bookings.slice(0, 8).map((b) => {
    const d = formatScheduleDate(bookingDate(b));
    const t = formatScheduleTime(bookingTime(b));
    return `• ${d}${t ? ` ${t}` : ""} — ${b.customer_name || "Customer"} @ ${(b.address || "").slice(0, 40)}`;
  });
  const more = bookings.length > 8 ? `\n…and ${bookings.length - 8} more.` : "";
  return `Hi ${providerName}, your schedule at ${businessName} (${formatScheduleDate(startDate)} – ${formatScheduleDate(endDate)}):\n${lines.join("\n")}${more}`;
}

/**
 * Sends one schedule email (and optional SMS) per provider for the given bookings.
 */
export async function sendProviderSchedule(
  supabase: SupabaseClient,
  options: {
    businessId: string;
    startDate: string;
    endDate: string;
    bookings: ScheduleBookingRow[];
    sendSms?: boolean;
    appBaseUrl: string;
  },
): Promise<SendProviderScheduleResult> {
  const { businessId, startDate, endDate, bookings, sendSms = false, appBaseUrl } = options;
  const result: SendProviderScheduleResult = {
    providersNotified: 0,
    emailsSent: 0,
    smsSent: 0,
    bookingsUpdated: 0,
    skipped: [],
    warnings: [],
  };

  const resendKey = process.env.RESEND_API_KEY?.trim();
  const fromEmail = process.env.RESEND_FROM_EMAIL?.trim();
  if (!resendKey || !fromEmail) {
    throw new Error("Email is not configured (RESEND_API_KEY / RESEND_FROM_EMAIL)");
  }

  const tpl = await ensureSendScheduleNotificationTemplate(supabase, businessId);
  if (!tpl) {
    throw new Error(
      `Could not load or create the "${SEND_SCHEDULE_TEMPLATE_NAME}" email template. Open Settings → Notifications → Notification Template to add one, then try again.`,
    );
  }

  const { data: business } = await supabase
    .from("businesses")
    .select("name, website, logo_url, business_email, business_phone, currency")
    .eq("id", businessId)
    .maybeSingle();

  const businessName = business?.name || "Your Business";
  const currency = business?.currency || "USD";
  const siteUrl =
    business?.website && /^https?:\/\//i.test(String(business.website))
      ? String(business.website).replace(/\/$/, "")
      : appBaseUrl.replace(/\/$/, "");

  const withProvider = bookings.filter((b) => b.provider_id);
  for (const b of bookings) {
    if (!b.provider_id) {
      result.skipped.push({ bookingId: b.id, reason: "No provider assigned" });
    }
  }

  if (withProvider.length === 0) {
    return result;
  }

  const providerIds = [...new Set(withProvider.map((b) => b.provider_id!))];
  const { data: providers } = await supabase
    .from("service_providers")
    .select("id, first_name, last_name, email, phone")
    .eq("business_id", businessId)
    .in("id", providerIds);

  const { data: prefsRows } = await supabase
    .from("provider_preferences")
    .select("provider_id, email_notifications, sms_notifications")
    .in("provider_id", providerIds);

  const prefsByProvider = new Map(
    (prefsRows ?? []).map((p) => [
      (p as { provider_id: string }).provider_id,
      p as { email_notifications?: boolean; sms_notifications?: boolean },
    ]),
  );

  const resend = new Resend(resendKey);
  const sentAt = new Date().toISOString();

  for (const provider of providers ?? []) {
    const pid = provider.id as string;
    const providerBookings = withProvider.filter((b) => b.provider_id === pid);
    if (providerBookings.length === 0) continue;

    const prefs = prefsByProvider.get(pid);
    if (prefs && prefs.email_notifications === false) {
      for (const b of providerBookings) {
        result.skipped.push({ bookingId: b.id, reason: "Provider email notifications disabled" });
      }
      continue;
    }

    const email = String(provider.email ?? "").trim();
    if (!email) {
      for (const b of providerBookings) {
        result.skipped.push({ bookingId: b.id, reason: "Provider has no email" });
      }
      continue;
    }

    const providerName =
      `${provider.first_name ?? ""} ${provider.last_name ?? ""}`.trim() || "Provider";
    const scheduleBody = buildProviderScheduleTableHtml(providerBookings, currency);

    const vars: Record<string, string> = {
      email_body: scheduleBody,
      provider_name: providerName,
      customer_name: providerName,
      business_name: businessName,
      business_logo_url: business?.logo_url || `${appBaseUrl}/images/logo.png`,
      support_email: business?.business_email || "",
      support_phone: business?.business_phone || "",
      store_currency: currency,
      schedule_start: formatScheduleDate(startDate),
      schedule_end: formatScheduleDate(endDate),
      date: formatScheduleDate(startDate),
      booking_count: String(providerBookings.length),
      site_url: siteUrl,
      service: providerBookings.length === 1 ? providerBookings[0].service || "" : `${providerBookings.length} bookings`,
      address: "",
      time: "",
      booking_ref: "",
      total_price: "",
      total_price_formatted: "",
    };

    const defaultSubject = `Your schedule: ${formatScheduleDate(startDate)} – ${formatScheduleDate(endDate)} — ${businessName}`;
    const renderedSubject =
      substituteEmailPlaceholders((tpl.subject || "").trim(), vars).trim() || defaultSubject;
    const renderedHtml = resolvePublicAssetUrls(
      substituteEmailPlaceholders(tpl.body, vars, { escapeValues: true, htmlUnescapedKeys: ["email_body"] }),
      appBaseUrl,
    );

    const { error: sendErr } = await resend.emails.send({
      from: fromEmail,
      to: [email],
      subject: renderedSubject,
      html: renderedHtml,
      replyTo: (business?.business_email || "").trim() || undefined,
    });

    if (sendErr) {
      console.error("[sendProviderSchedule] Resend error:", sendErr);
      for (const b of providerBookings) {
        result.skipped.push({ bookingId: b.id, reason: "Email send failed" });
      }
      result.warnings.push(`Failed to email ${providerName}: ${sendErr.message || "unknown error"}`);
      continue;
    }

    result.emailsSent += 1;
    result.providersNotified += 1;

    let smsRecipient: string | null = null;
    if (sendSms && prefs?.sms_notifications !== false) {
      const phone = String(provider.phone ?? "").trim();
      if (phone) {
        const smsBody = buildScheduleSmsBody(providerName, businessName, startDate, endDate, providerBookings);
        const smsResult = await sendSmsViaTwilio(phone, smsBody);
        if (smsResult.sent) {
          result.smsSent += 1;
          smsRecipient = phone;
        } else if (smsResult.reason && !result.warnings.includes(smsResult.reason)) {
          result.warnings.push(smsResult.reason);
        }
      }
    }

    const recipient = smsRecipient ? `${email}, ${smsRecipient}` : email;
    const bookingIds = [...new Set(providerBookings.map((b) => b.id))];
    const { error: updateErr } = await supabase
      .from("bookings")
      .update({ schedule_sent_at: sentAt, schedule_sent_to: recipient })
      .eq("business_id", businessId)
      .in("id", bookingIds);

    if (updateErr) {
      console.warn("[sendProviderSchedule] Could not record schedule_sent_at:", updateErr.message);
      result.warnings.push("Schedule was sent but could not update booking records (run migration 158).");
    } else {
      result.bookingsUpdated += bookingIds.length;
    }
  }

  return result;
}
