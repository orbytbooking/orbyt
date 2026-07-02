import type { SupabaseClient } from "@supabase/supabase-js";
import { Resend } from "resend";
import { substituteEmailPlaceholders, resolvePublicAssetUrls } from "@/lib/emailTemplatePlaceholders";
import {
  BOOKING_REMINDER_NOTIFICATIONS,
  findBookingReminderRule,
  isWithinReminderWindow,
  resolveReminderOffsetMinutes,
  type BookingReminderRule,
} from "@/lib/notificationReminderRules";

export type ReminderBookingRow = {
  id: string;
  business_id: string;
  provider_id: string | null;
  customer_name: string | null;
  customer_email: string | null;
  exclude_customer_notification?: boolean | null;
  service: string | null;
  scheduled_date: string | null;
  date: string | null;
  scheduled_time: string | null;
  time: string | null;
  address: string | null;
  total_price: number | string | null;
  status: string | null;
  notification_reminders_sent?: Record<string, string> | null;
};

type EnabledTemplate = {
  business_id: string;
  name: string;
  subject: string;
  body: string;
};

type ProviderRow = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
};

export type ProcessBookingRemindersResult = {
  emailsSent: number;
  bookingsChecked: number;
  skipped: { bookingId: string; reason: string }[];
  warnings: string[];
};

const ACTIVE_STATUSES = ["pending", "confirmed", "in_progress"];

function bookingDate(b: ReminderBookingRow): string {
  return String(b.scheduled_date ?? b.date ?? "").trim().slice(0, 10);
}

function bookingTime(b: ReminderBookingRow): string {
  return String(b.scheduled_time ?? b.time ?? "").trim();
}

export function getBookingStartDate(booking: ReminderBookingRow): Date | null {
  const dateStr = bookingDate(booking);
  const timeStr = bookingTime(booking);
  if (!dateStr || !timeStr) return null;

  const timePart = timeStr.includes(":") ? timeStr.slice(0, 5) : timeStr;
  const [h, m] = timePart.split(":").map(Number);
  const start = new Date(`${dateStr}T00:00:00`);
  if (Number.isNaN(start.getTime())) return null;
  start.setHours(h || 0, m || 0, 0, 0);
  return start;
}

export function minutesUntilBookingStart(booking: ReminderBookingRow, now: Date): number | null {
  const start = getBookingStartDate(booking);
  if (!start) return null;
  return (start.getTime() - now.getTime()) / (60 * 1000);
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function formatScheduleDate(dateStr: string | null): string {
  if (!dateStr) return "TBD";
  const d = new Date(`${dateStr}T00:00:00`);
  if (Number.isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" });
}

function formatScheduleTime(timeStr: string | null): string {
  if (!timeStr) return "";
  return timeStr.includes(":") ? timeStr.slice(0, 5) : timeStr;
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

function buildReminderEmailBody(
  booking: ReminderBookingRow,
  recipientName: string,
  businessName: string,
  templateName: string,
  currency: string,
): string {
  const ref = `BK${String(booking.id).slice(-6).toUpperCase()}`;
  const dateLabel = formatScheduleDate(bookingDate(booking));
  const timeLabel = formatScheduleTime(bookingTime(booking)) || "TBD";
  const intro = templateName.toLowerCase().includes("unassigned")
    ? `Hi ${escapeHtml(recipientName)}, this is a reminder that a job is available in the unassigned folder.`
    : templateName.toLowerCase().includes("booking reminder")
      ? `Hi ${escapeHtml(recipientName)}, this is a reminder about your upcoming booking.`
      : `Hi ${escapeHtml(recipientName)}, this is a reminder about an upcoming booking.`;

  return `<div style="margin:0 0 12px;font-size:15px;line-height:1.6;">
<p style="margin:0 0 12px;">${intro}</p>
<table style="width:100%;border-collapse:collapse;font-size:14px;margin:12px 0;">
<tbody>
<tr><td style="padding:6px 0;color:#6b7280;width:120px;">Business</td><td style="padding:6px 0;"><strong>${escapeHtml(businessName)}</strong></td></tr>
<tr><td style="padding:6px 0;color:#6b7280;">Service</td><td style="padding:6px 0;">${escapeHtml(booking.service || "Service")}</td></tr>
<tr><td style="padding:6px 0;color:#6b7280;">Customer</td><td style="padding:6px 0;">${escapeHtml(booking.customer_name || "Customer")}</td></tr>
<tr><td style="padding:6px 0;color:#6b7280;">Date</td><td style="padding:6px 0;">${escapeHtml(dateLabel)}</td></tr>
<tr><td style="padding:6px 0;color:#6b7280;">Time</td><td style="padding:6px 0;">${escapeHtml(timeLabel)}</td></tr>
<tr><td style="padding:6px 0;color:#6b7280;">Location</td><td style="padding:6px 0;">${escapeHtml(booking.address || "")}</td></tr>
<tr><td style="padding:6px 0;color:#6b7280;">Reference</td><td style="padding:6px 0;">${ref}</td></tr>
<tr><td style="padding:6px 0;color:#6b7280;">Total</td><td style="padding:6px 0;">${formatMoney(booking.total_price, currency)}</td></tr>
</tbody>
</table>
</div>`;
}

function getRemindersSent(booking: ReminderBookingRow): Record<string, string> {
  const raw = booking.notification_reminders_sent;
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  return raw as Record<string, string>;
}

function wasReminderSent(booking: ReminderBookingRow, sentKey: string): boolean {
  return Boolean(getRemindersSent(booking)[sentKey]);
}

async function markReminderSent(
  supabase: SupabaseClient,
  booking: ReminderBookingRow,
  sentKey: string,
  sentAt: string,
): Promise<boolean> {
  const next = { ...getRemindersSent(booking), [sentKey]: sentAt };
  const { error } = await supabase
    .from("bookings")
    .update({ notification_reminders_sent: next, updated_at: sentAt })
    .eq("id", booking.id);
  if (error) {
    console.error("[sendBookingReminderEmails] mark sent:", booking.id, error);
    return false;
  }
  booking.notification_reminders_sent = next;
  return true;
}

async function sendReminderEmail(options: {
  to: string;
  tpl: { subject: string; body: string };
  vars: Record<string, string>;
  fromEmail: string;
  replyTo?: string;
  defaultSubject: string;
  appBaseUrl: string;
}): Promise<{ ok: boolean; error?: string }> {
  const resendKey = process.env.RESEND_API_KEY?.trim();
  if (!resendKey) return { ok: false, error: "RESEND_API_KEY not configured" };

  const renderedSubject =
    substituteEmailPlaceholders((options.tpl.subject || "").trim(), options.vars).trim() ||
    options.defaultSubject;
  const renderedHtml = resolvePublicAssetUrls(
    substituteEmailPlaceholders(options.tpl.body, options.vars, {
      escapeValues: true,
      htmlUnescapedKeys: ["email_body"],
    }),
    options.appBaseUrl,
  );

  const resend = new Resend(resendKey);
  const { error } = await resend.emails.send({
    from: options.fromEmail,
    to: [options.to],
    subject: renderedSubject,
    html: renderedHtml,
    replyTo: options.replyTo,
  });

  if (error) return { ok: false, error: error.message || "send failed" };
  return { ok: true };
}

function buildTemplateVars(options: {
  recipientName: string;
  businessName: string;
  business: {
    logo_url?: string | null;
    business_email?: string | null;
    business_phone?: string | null;
    currency?: string | null;
    website?: string | null;
  };
  booking: ReminderBookingRow;
  emailBody: string;
  appBaseUrl: string;
}): Record<string, string> {
  const { recipientName, businessName, business, booking, emailBody, appBaseUrl } = options;
  const siteUrl =
    business.website && /^https?:\/\//i.test(String(business.website))
      ? String(business.website).replace(/\/$/, "")
      : appBaseUrl.replace(/\/$/, "");
  const currency = business.currency || "USD";
  const ref = `BK${String(booking.id).slice(-6).toUpperCase()}`;

  return {
    email_body: emailBody,
    provider_name: recipientName,
    customer_name: booking.customer_name || "Customer",
    business_name: businessName,
    business_logo_url: business.logo_url || `${appBaseUrl}/images/logo.png`,
    support_email: business.business_email || "",
    support_phone: business.business_phone || "",
    store_currency: currency,
    service: booking.service || "",
    date: formatScheduleDate(bookingDate(booking)),
    time: formatScheduleTime(bookingTime(booking)),
    address: booking.address || "",
    booking_ref: ref,
    total_price: String(booking.total_price ?? ""),
    total_price_formatted: formatMoney(booking.total_price, currency),
    site_url: siteUrl,
  };
}

async function loadEnabledReminderTemplates(supabase: SupabaseClient): Promise<EnabledTemplate[]> {
  const knownNames = new Set(BOOKING_REMINDER_NOTIFICATIONS.map((r) => r.templateName.trim().toLowerCase()));
  const { data, error } = await supabase
    .from("business_notification_templates")
    .select("business_id, name, subject, body, enabled")
    .eq("enabled", true);

  if (error) {
    console.error("[sendBookingReminderEmails] templates:", error);
    return [];
  }

  return (data ?? []).filter((row) => {
    const name = String((row as { name?: string }).name ?? "").trim().toLowerCase();
    return knownNames.has(name) && String((row as { body?: string }).body ?? "").trim();
  }) as EnabledTemplate[];
}

/**
 * Sends time-based booking reminder emails when matching notification templates are enabled.
 * Run via cron every 10–15 minutes.
 */
export async function processBookingReminderEmails(
  supabase: SupabaseClient,
  options: { appBaseUrl: string; now?: Date; windowMinutes?: number },
): Promise<ProcessBookingRemindersResult> {
  const now = options.now ?? new Date();
  const windowMinutes = options.windowMinutes ?? 20;
  const appBaseUrl = options.appBaseUrl.replace(/\/$/, "");
  const fromEmail = process.env.RESEND_FROM_EMAIL?.trim();

  const result: ProcessBookingRemindersResult = {
    emailsSent: 0,
    bookingsChecked: 0,
    skipped: [],
    warnings: [],
  };

  if (!fromEmail) {
    result.warnings.push("RESEND_FROM_EMAIL not configured");
    return result;
  }

  const templates = await loadEnabledReminderTemplates(supabase);
  if (templates.length === 0) return result;

  const businessIds = [...new Set(templates.map((t) => t.business_id))];
  const today = now.toISOString().slice(0, 10);

  const { data: bookings, error: bookingsError } = await supabase
    .from("bookings")
    .select(
      "id, business_id, provider_id, customer_name, customer_email, exclude_customer_notification, service, scheduled_date, date, scheduled_time, time, address, total_price, status, notification_reminders_sent",
    )
    .in("business_id", businessIds)
    .in("status", ACTIVE_STATUSES)
    .or(`scheduled_date.gte.${today},date.gte.${today}`);

  if (bookingsError) {
    result.warnings.push(bookingsError.message);
    return result;
  }

  const bookingRows = (bookings ?? []) as ReminderBookingRow[];
  result.bookingsChecked = bookingRows.length;

  const businessCache = new Map<
    string,
    {
      name: string;
      logo_url?: string | null;
      business_email?: string | null;
      business_phone?: string | null;
      currency?: string | null;
      website?: string | null;
    }
  >();

  const providerCache = new Map<string, ProviderRow>();
  const providerPrefsCache = new Map<string, { email_notifications?: boolean }>();
  const providersByBusinessCache = new Map<string, ProviderRow[]>();

  for (const tpl of templates) {
    const rule = findBookingReminderRule(tpl.name);
    if (!rule) continue;

    const offsetMinutes = resolveReminderOffsetMinutes(rule);
    if (offsetMinutes == null) continue;

    const businessBookings = bookingRows.filter((b) => b.business_id === tpl.business_id);
    if (businessBookings.length === 0) continue;

    let business = businessCache.get(tpl.business_id);
    if (!business) {
      const { data: biz } = await supabase
        .from("businesses")
        .select("name, website, logo_url, business_email, business_phone, currency")
        .eq("id", tpl.business_id)
        .maybeSingle();
      business = {
        name: biz?.name || "Your Business",
        logo_url: biz?.logo_url,
        business_email: biz?.business_email,
        business_phone: biz?.business_phone,
        currency: biz?.currency,
        website: biz?.website,
      };
      businessCache.set(tpl.business_id, business);
    }

    const businessName = business.name;

    if (rule.unassignedOnly) {
      await processUnassignedFolderReminders({
        supabase,
        rule,
        tpl,
        businessBookings: businessBookings.filter((b) => !b.provider_id),
        business,
        businessName,
        offsetMinutes,
        windowMinutes,
        now,
        appBaseUrl,
        fromEmail,
        providersByBusinessCache,
        providerPrefsCache,
        result,
      });
      continue;
    }

    for (const booking of businessBookings) {
      if (rule.requiresAssignedProvider && !booking.provider_id) {
        continue;
      }
      if (wasReminderSent(booking, rule.sentKey)) {
        continue;
      }

      const minutesUntil = minutesUntilBookingStart(booking, now);
      if (minutesUntil == null) {
        result.skipped.push({ bookingId: booking.id, reason: "Missing schedule" });
        continue;
      }
      if (!isWithinReminderWindow(minutesUntil, offsetMinutes, windowMinutes)) {
        continue;
      }

      const recipient = await resolveReminderRecipient({
        supabase,
        rule,
        booking,
        businessEmail: business.business_email,
        providerCache,
        providerPrefsCache,
      });

      if (!recipient) {
        result.skipped.push({
          bookingId: booking.id,
          reason: `${rule.recipientType} recipient unavailable`,
        });
        continue;
      }

      const emailBody = buildReminderEmailBody(
        booking,
        recipient.name,
        businessName,
        tpl.name,
        business.currency || "USD",
      );
      const vars = buildTemplateVars({
        recipientName: recipient.name,
        businessName,
        business,
        booking,
        emailBody,
        appBaseUrl,
      });

      const defaultSubject = `${tpl.name} — ${businessName}`;
      const sendResult = await sendReminderEmail({
        to: recipient.email,
        tpl,
        vars,
        fromEmail,
        replyTo: (business.business_email || "").trim() || undefined,
        defaultSubject,
        appBaseUrl,
      });

      if (!sendResult.ok) {
        result.skipped.push({
          bookingId: booking.id,
          reason: sendResult.error || "Email send failed",
        });
        continue;
      }

      const marked = await markReminderSent(supabase, booking, rule.sentKey, now.toISOString());
      if (marked) result.emailsSent += 1;
    }
  }

  return result;
}

async function resolveReminderRecipient(options: {
  supabase: SupabaseClient;
  rule: BookingReminderRule;
  booking: ReminderBookingRow;
  businessEmail?: string | null;
  providerCache: Map<string, ProviderRow>;
  providerPrefsCache: Map<string, { email_notifications?: boolean }>;
}): Promise<{ email: string; name: string } | null> {
  const { supabase, rule, booking, businessEmail, providerCache, providerPrefsCache } = options;
  if (rule.recipientType === "admin") {
    const email = String(businessEmail ?? "").trim();
    if (!email) return null;
    return { email, name: "Admin" };
  }

  if (rule.recipientType === "customer") {
    if (booking.exclude_customer_notification) return null;
    const email = String(booking.customer_email ?? "").trim();
    if (!email) return null;
    const name = String(booking.customer_name ?? "").trim() || "Customer";
    return { email, name };
  }

  const providerId = booking.provider_id;
  if (!providerId) return null;

  let provider = providerCache.get(providerId);
  if (!provider) {
    const { data } = await supabase
      .from("service_providers")
      .select("id, first_name, last_name, email")
      .eq("id", providerId)
      .maybeSingle();
    if (!data) return null;
    provider = data as ProviderRow;
    providerCache.set(providerId, provider);
  }

  const email = String(provider.email ?? "").trim();
  if (!email) return null;

  let prefs = providerPrefsCache.get(providerId);
  if (!prefs) {
    const { data } = await supabase
      .from("provider_preferences")
      .select("email_notifications")
      .eq("provider_id", providerId)
      .maybeSingle();
    prefs = (data as { email_notifications?: boolean }) ?? {};
    providerPrefsCache.set(providerId, prefs);
  }

  if (prefs.email_notifications === false) return null;

  const name = `${provider.first_name ?? ""} ${provider.last_name ?? ""}`.trim() || "Provider";
  return { email, name };
}

async function processUnassignedFolderReminders(options: {
  supabase: SupabaseClient;
  rule: BookingReminderRule;
  tpl: EnabledTemplate;
  businessBookings: ReminderBookingRow[];
  business: {
    name: string;
    logo_url?: string | null;
    business_email?: string | null;
    business_phone?: string | null;
    currency?: string | null;
    website?: string | null;
  };
  businessName: string;
  offsetMinutes: number;
  windowMinutes: number;
  now: Date;
  appBaseUrl: string;
  fromEmail: string;
  providersByBusinessCache: Map<string, ProviderRow[]>;
  providerPrefsCache: Map<string, { email_notifications?: boolean }>;
  result: ProcessBookingRemindersResult;
}): Promise<void> {
  const {
    supabase,
    rule,
    tpl,
    businessBookings,
    business,
    businessName,
    offsetMinutes,
    windowMinutes,
    now,
    appBaseUrl,
    fromEmail,
    providersByBusinessCache,
    providerPrefsCache,
    result,
  } = options;

  if (businessBookings.length === 0) return;

  const businessId = tpl.business_id;
  let providers = providersByBusinessCache.get(businessId);
  if (!providers) {
    const { data: opts } = await supabase
      .from("business_store_options")
      .select("providers_can_see_unassigned")
      .eq("business_id", businessId)
      .maybeSingle();

    if (opts?.providers_can_see_unassigned === false) return;

    const { data: providerRows } = await supabase
      .from("service_providers")
      .select("id, first_name, last_name, email")
      .eq("business_id", businessId)
      .eq("status", "active");

    providers = (providerRows ?? []) as ProviderRow[];
    providersByBusinessCache.set(businessId, providers);
  }

  for (const booking of businessBookings) {
    if (wasReminderSent(booking, rule.sentKey)) continue;

    const minutesUntil = minutesUntilBookingStart(booking, now);
    if (minutesUntil == null) continue;
    if (!isWithinReminderWindow(minutesUntil, offsetMinutes, windowMinutes)) continue;

    let anySent = false;
    for (const provider of providers) {
      const email = String(provider.email ?? "").trim();
      if (!email) continue;

      let prefs = providerPrefsCache.get(provider.id);
      if (!prefs) {
        const { data } = await supabase
          .from("provider_preferences")
          .select("email_notifications")
          .eq("provider_id", provider.id)
          .maybeSingle();
        prefs = (data as { email_notifications?: boolean }) ?? {};
        providerPrefsCache.set(provider.id, prefs);
      }
      if (prefs.email_notifications === false) continue;

      const name = `${provider.first_name ?? ""} ${provider.last_name ?? ""}`.trim() || "Provider";
      const emailBody = buildReminderEmailBody(
        booking,
        name,
        businessName,
        tpl.name,
        business.currency || "USD",
      );
      const vars = buildTemplateVars({
        recipientName: name,
        businessName,
        business,
        booking,
        emailBody,
        appBaseUrl,
      });

      const sendResult = await sendReminderEmail({
        to: email,
        tpl,
        vars,
        fromEmail,
        replyTo: (business.business_email || "").trim() || undefined,
        defaultSubject: `${tpl.name} — ${businessName}`,
        appBaseUrl,
      });

      if (sendResult.ok) {
        anySent = true;
        result.emailsSent += 1;
      }
    }

    if (anySent) {
      await markReminderSent(supabase, booking, rule.sentKey, now.toISOString());
    }
  }
}
