/** Shared quote email HTML for admin preview + server send. */

/** Missing-field placeholder in quote emails (no em dash). */
const QUOTE_EMPTY = "-";

export function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;",
  };
  return text.replace(/[&<>"']/g, (m) => map[m] ?? m);
}

export function defaultQuoteEmailSubject(businessName: string): string {
  return `${businessName} sent a quote for your booking.`;
}

export function firstNameFromCustomerName(name: string): string {
  const t = name.trim().split(/\s+/)[0];
  return t || "there";
}

export function formatTime12h(timeStr: string | null | undefined): string {
  if (!timeStr) return "";
  try {
    const raw = String(timeStr).trim();
    const match = raw.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?/);
    if (!match) return raw;
    let h = parseInt(match[1], 10);
    const m = parseInt(match[2], 10);
    const ampm = h >= 12 ? "PM" : "AM";
    h = h % 12 || 12;
    return `${h}:${String(m).padStart(2, "0")} ${ampm}`;
  } catch {
    return String(timeStr);
  }
}

export function formatUsDateFromYmd(ymd: string | null | undefined): string {
  if (!ymd || String(ymd).trim().length < 8) return QUOTE_EMPTY;
  const d = new Date(String(ymd).slice(0, 10) + "T12:00:00");
  if (Number.isNaN(d.getTime())) return QUOTE_EMPTY;
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${mm}/${dd}/${yyyy}`;
}

export function bookingDisplayRef(bookingId: string): string {
  const compact = bookingId.replace(/-/g, "");
  return compact.slice(-6).toUpperCase();
}

export function moneyFromBooking(totalPrice: unknown, amount: unknown): string {
  const raw = totalPrice ?? amount;
  const n = typeof raw === "string" ? parseFloat(raw) : Number(raw);
  return Number.isFinite(n) ? `$${n.toFixed(2)}` : "$0.00";
}

export function paymentMethodLabel(pm: string | null | undefined): string {
  const m = (pm || "").toLowerCase();
  if (m === "online" || m.includes("card")) return "CC";
  if (m === "cash") return "Cash/Check";
  return pm ? pm : QUOTE_EMPTY;
}

export type QuoteEmailExtras = {
  expiresOnDisplay?: string;
  daysUntilExpiry?: number;
  sendReminderAfterDays?: number | null;
  includeOffer?: boolean;
  offerType?: "fixed" | "percentage";
  offerValue?: number | null;
};

export type QuoteEmailBuildInput = {
  businessName: string;
  contactEmail: string;
  websiteUrl?: string | null;
  industryName: string;
  bookingRef: string;
  customerFirstName: string;
  service: string;
  frequency: string;
  bathrooms: string;
  sqft: string;
  bedrooms: string;
  professionals: string;
  serviceDateLine: string;
  paymentMethodLabel: string;
  serviceTotal: string;
  total: string;
  notes: string;
  bookNowUrl: string;
  extras?: QuoteEmailExtras;
};

function extractCustomization(booking: Record<string, unknown>): {
  bathrooms: string;
  sqft: string;
  bedrooms: string;
} {
  const c = booking.customization as Record<string, unknown> | undefined;
  const cv = (c?.categoryValues as Record<string, string>) || {};
  const bath =
    cv.Bathroom ??
    cv.bathroom ??
    (c?.bathroom as string) ??
    (c?.bathrooms as string) ??
    "";
  const sqft =
    cv["Sq Ft"] ??
    cv.sqFt ??
    (c?.squareMeters as string) ??
    (c?.sqFt as string) ??
    (c?.sqft as string) ??
    "";
  const bed =
    cv.Bedroom ??
    cv.bedroom ??
    (c?.bedroom as string) ??
    (c?.bedrooms as string) ??
    "";
  const clean = (v: unknown) => (v != null && String(v).trim() ? String(v).trim() : QUOTE_EMPTY);
  return {
    bathrooms: clean(bath),
    sqft: clean(sqft),
    bedrooms: clean(bed),
  };
}

export function buildQuoteEmailPayloadFromBooking(
  booking: Record<string, unknown>,
  ctx: {
    businessName: string;
    contactEmail: string;
    websiteUrl?: string | null;
    industryName?: string | null;
    appOrigin: string;
    businessId: string;
    extras?: QuoteEmailExtras;
  }
): QuoteEmailBuildInput {
  const dateRaw = String(booking.scheduled_date ?? booking.date ?? "").slice(0, 10);
  const timeRaw = String(booking.scheduled_time ?? booking.time ?? "").trim();
  const dateUs = formatUsDateFromYmd(dateRaw);
  const time12 = formatTime12h(timeRaw);
  const serviceDateLine =
    dateUs !== QUOTE_EMPTY && time12
      ? `${dateUs} ${time12}`
      : dateUs !== QUOTE_EMPTY
        ? dateUs
        : time12 || QUOTE_EMPTY;

  const { bathrooms, sqft, bedrooms } = extractCustomization(booking);
  const professionals =
    String(booking.provider_name ?? booking.assignedProvider ?? "").trim() || QUOTE_EMPTY;

  const totalStr = moneyFromBooking(booking.total_price, booking.amount);

  const bookNowUrl = `${ctx.appOrigin.replace(/\/$/, "")}/book-now?business=${encodeURIComponent(ctx.businessId)}&bookingId=${encodeURIComponent(String(booking.id))}`;

  return {
    businessName: ctx.businessName,
    contactEmail: ctx.contactEmail || "office@example.com",
    websiteUrl: ctx.websiteUrl,
    industryName: (ctx.industryName || QUOTE_EMPTY).trim(),
    bookingRef: bookingDisplayRef(String(booking.id)),
    customerFirstName: firstNameFromCustomerName(String(booking.customer_name ?? "")),
    service: String(booking.service ?? QUOTE_EMPTY),
    frequency: String(booking.frequency ?? QUOTE_EMPTY),
    bathrooms,
    sqft,
    bedrooms,
    professionals,
    serviceDateLine,
    paymentMethodLabel: paymentMethodLabel(String(booking.payment_method ?? "")),
    serviceTotal: totalStr,
    total: totalStr,
    notes: String(booking.notes ?? "").trim() || QUOTE_EMPTY,
    bookNowUrl,
    extras: ctx.extras,
  };
}

export function buildQuoteEmailHtml(input: QuoteEmailBuildInput): string {
  const e = escapeHtml;
  const biz = e(input.businessName);
  const contact = input.contactEmail.trim();
  const contactMail = contact ? `mailto:${escapeHtml(contact)}` : "#";
  const extras = input.extras || {};
  const includeOffer = extras.includeOffer === true;
  const offerType = extras.offerType;
  const offerValue = typeof extras.offerValue === "number" ? extras.offerValue : null;

  const parseMoney = (s: string) => {
    const n = typeof s === "string" ? parseFloat(s.replace(/[^0-9.\-]/g, "")) : NaN;
    return Number.isFinite(n) ? n : NaN;
  };

  const serviceTotalNum = parseMoney(input.serviceTotal);
  let couponDiscountNum = NaN;
  let discountedTotalNum = NaN;

  if (includeOffer && offerValue != null && Number.isFinite(serviceTotalNum) && offerValue > 0) {
    couponDiscountNum =
      offerType === "percentage"
        ? (serviceTotalNum * offerValue) / 100
        : offerValue;
    if (Number.isFinite(couponDiscountNum)) {
      // Cap so coupon cannot go below $0.
      couponDiscountNum = Math.min(Math.max(couponDiscountNum, 0), serviceTotalNum);
      discountedTotalNum = Math.max(serviceTotalNum - couponDiscountNum, 0);
    }
  }

  const formatMoney = (n: number) => `$${n.toFixed(2)}`;

  const couponDiscountStr = Number.isFinite(couponDiscountNum) ? formatMoney(couponDiscountNum) : "";
  const discountedTotalStr = Number.isFinite(discountedTotalNum) ? formatMoney(discountedTotalNum) : input.total;

  // Your screenshot shows the discount lines in the Payment Summary; avoid duplicating
  // a second "Special offer" line.
  const offerLine =
    includeOffer && couponDiscountStr && discountedTotalStr
      ? ""
      : `<p style="margin:16px 0;text-align:center;font-size:15px;color:#1e3a5f;"><strong>Special offer</strong>. See details in your account or reply to this email.</p>`;
  const expiryLine =
    extras.expiresOnDisplay != null && extras.daysUntilExpiry != null
      ? `<p style="margin:12px 0;font-size:13px;color:#64748b;text-align:center;">This quote expires on <strong>${e(extras.expiresOnDisplay)}</strong> (${extras.daysUntilExpiry} day(s) from today).</p>`
      : "";
  const reminderLine =
    extras.sendReminderAfterDays != null && extras.sendReminderAfterDays > 0
      ? `<p style="margin:8px 0;font-size:13px;color:#64748b;text-align:center;">We will send a reminder after ${extras.sendReminderAfterDays} day(s) if you have not booked.</p>`
      : "";

  const row = (label: string, value: string) => `
    <tr>
      <td style="padding:6px 12px 6px 0;color:#475569;font-size:14px;vertical-align:top;">${e(label)}</td>
      <td style="padding:6px 0;text-align:right;font-size:14px;color:#0f172a;font-weight:500;">${e(value)}</td>
    </tr>`;

  const website = (input.websiteUrl || "").trim();
  const webHref = website
    ? website.startsWith("http")
      ? website
      : `https://${website}`
    : "";
  const secondaryHref = webHref || input.bookNowUrl;

  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"/></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#0f172a;">
  <div style="max-width:600px;margin:0 auto;padding:24px 16px;">
    <div style="background:#ffffff;border-radius:8px;overflow:hidden;border:1px solid #e2e8f0;">
      <div style="padding:28px 24px 8px;">
        <p style="margin:0 0 16px;font-size:18px;color:#1e3a5f;text-align:center;">Hi ${e(input.customerFirstName)},</p>
        <p style="margin:0 0 20px;font-size:15px;line-height:1.6;color:#334155;text-align:center;">
          Thank you for your interest in ${biz}. Here is your custom quote. If anything is inaccurate please reach out to us at
          <a href="${contactMail}" style="color:#2563eb;">${e(contact)}</a>.
        </p>
        <h2 style="margin:24px 0 12px;font-size:16px;color:#1e3a5f;text-align:center;">Booking Details</h2>
        <h3 style="margin:0 0 8px;font-size:15px;color:#0f172a;text-decoration:underline;">Booking Summary</h3>
        <table style="width:100%;border-collapse:collapse;margin-bottom:16px;">
          ${row("Booking Id", input.bookingRef)}
          ${row("Date", input.serviceDateLine)}
        </table>
        <table style="width:100%;border-collapse:collapse;margin-bottom:8px;">
          ${row("Industry", input.industryName)}
          ${row("Service", input.service)}
          ${row("Frequency", input.frequency)}
          ${row("Bathrooms", input.bathrooms)}
          ${row("Sq Ft", input.sqft)}
          ${row("Bedrooms", input.bedrooms)}
          ${row("Professional(s)", input.professionals)}
        </table>
        <h3 style="margin:20px 0 8px;font-size:15px;color:#0f172a;text-decoration:underline;">Payment Summary</h3>
        <table style="width:100%;border-collapse:collapse;">
          ${row("Payment Method", input.paymentMethodLabel)}
          ${row("Service Total", input.serviceTotal)}
          ${includeOffer && couponDiscountStr ? row("Coupon Discount", couponDiscountStr) : ""}
          ${includeOffer && discountedTotalStr ? row("Discounted Total", discountedTotalStr) : ""}
          <tr>
            <td style="padding:8px 12px 8px 0;font-size:15px;font-weight:700;color:#0f172a;">TOTAL</td>
            <td style="padding:8px 0;text-align:right;font-size:15px;font-weight:700;color:#0f172a;">${e(discountedTotalStr)}</td>
          </tr>
        </table>
        <p style="margin:16px 0 8px;font-size:14px;color:#475569;"><strong>Key Information &amp; Job Notes:</strong> ${e(input.notes)}</p>
        ${offerLine}
        ${expiryLine}
        ${reminderLine}
        <p style="margin:28px 0 12px;font-size:15px;color:#334155;text-align:center;">When you are ready to book an appointment, just click the button below:</p>
        <div style="text-align:center;margin:20px 0 28px;">
          <a href="${e(input.bookNowUrl)}" style="display:inline-block;background:#2563eb;color:#ffffff !important;text-decoration:none;padding:14px 36px;border-radius:6px;font-size:16px;font-weight:600;">Book Now</a>
        </div>
        <p style="margin:0 0 8px;font-size:14px;color:#475569;text-align:center;">Thanks for using ${biz}</p>
        <p style="margin:0 0 16px;font-size:14px;color:#475569;text-align:center;">The team at ${biz}</p>
        <p style="margin:0 0 24px;font-size:14px;color:#475569;text-align:center;">
          Have a question? Contact us at <a href="${contactMail}" style="color:#2563eb;">${e(contact)}</a>
        </p>
        <table style="width:100%;border-collapse:collapse;margin-top:8px;">
          <tr>
            <td style="padding:12px;text-align:center;">
              <a href="${e(input.bookNowUrl)}" style="display:inline-block;margin:4px;padding:10px 14px;background:#0d9488;color:#fff !important;text-decoration:none;border-radius:6px;font-size:12px;">Invite Friend</a>
              <a href="${e(secondaryHref)}" style="display:inline-block;margin:4px;padding:10px 14px;background:#7c3aed;color:#fff !important;text-decoration:none;border-radius:6px;font-size:12px;">Send Gift Card</a>
              <a href="${e(secondaryHref)}" style="display:inline-block;margin:4px;padding:10px 14px;background:#dc2626;color:#fff !important;text-decoration:none;border-radius:6px;font-size:12px;">Visit Blog</a>
            </td>
          </tr>
        </table>
      </div>
    </div>
  </div>
</body></html>`;
}
