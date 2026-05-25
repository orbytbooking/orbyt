/** Default master notification email HTML and short-code reference for the template editor. */
export const DEFAULT_MASTER_TEMPLATE_BODY_HTML = `<table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" data-template-shell="true" style="width:100%;margin:0;padding:0;background-color:#f4f4f5;">
<tr>
<td align="center" style="padding:24px 12px;">
<table role="presentation" border="0" cellpadding="0" cellspacing="0" width="600" data-template-shell="true" style="width:100%;max-width:600px;border-collapse:separate;border-spacing:0;background-color:#ffffff;border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;font-family:Arial,Helvetica,sans-serif;color:#000;font-size:16px;">
<tbody>
<tr>
<td align="center" style="padding:20px 20px 0;text-align:center;">
<table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" data-template-block="banner" style="width:100%;">
<tr>
<td align="center" style="padding:0;text-align:center;">
<img src="/images/email/orbyt-service-banner.png" alt="ORBYT SERVICE" width="560" style="max-width:100%;width:100%;height:auto;display:block;border:0;margin:0 auto;">
</td>
</tr>
</table>
</td>
</tr>
<tr>
<td style="text-align:center;padding:12px 20px 16px;">
<table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" data-template-block="email-body" style="width:100%;">
<tr>
<td style="text-align:center;padding:0 0 8px;">
<span class="merge-tag" contenteditable="false" data-shortcode="true">{{email_body}}</span>
</td>
</tr>
<tr>
<td style="text-align:center;padding:8px 0 0;">
<p style="margin:0;">
<span style="display:block;line-height:28px;">Thanks for using <span class="merge-tag" contenteditable="false" data-shortcode="true">{{business_name}}</span></span>
<span style="display:block;line-height:28px;">-Team <span class="merge-tag" contenteditable="false" data-shortcode="true">{{business_name}}</span></span>
</p>
<p style="margin:0;">
<span style="display:block;line-height:27px;">Have a question? Contact us at </span>
<a href="mailto:{{support_email}}" style="line-height:27px;color:#2A90FF;text-decoration:underline;">
<span class="merge-tag" contenteditable="false" data-shortcode="true">{{support_email}}</span>
</a>
</p>
</td>
</tr>
</table>
</td>
</tr>
<tr>
<td style="padding:8px 0 20px;">
<table role="presentation" border="0" cellpadding="0" cellspacing="0" align="center" width="100%" data-template-block="cta-row" style="width:100%;border-collapse:collapse;table-layout:fixed;">
<tr>
<td width="33.333%" style="padding:0;vertical-align:top;">
<a href="{{site_url}}/referrals" style="display:block;height:120px;overflow:hidden;line-height:0;"><img alt="Invite" src="/images/email/invite.png" width="186" height="120" style="display:block;width:100%;height:120px;object-fit:cover;object-position:center;border:0;"></a>
</td>
<td width="33.333%" style="padding:0;vertical-align:top;">
<a href="{{site_url}}/gift-cards" style="display:block;height:120px;overflow:hidden;line-height:0;"><img alt="Gift card" src="/images/email/giftcard.png" width="186" height="120" style="display:block;width:100%;height:120px;object-fit:cover;object-position:center;border:0;"></a>
</td>
<td width="33.333%" style="padding:0;vertical-align:top;">
<a href="{{site_url}}/blog" style="display:block;height:120px;overflow:hidden;line-height:0;"><img alt="Blog" src="/images/email/blog.png" width="186" height="120" style="display:block;width:100%;height:120px;object-fit:cover;object-position:center;border:0;"></a>
</td>
</tr>
</table>
</td>
</tr>
<tr>
<td style="text-align:center;padding:0 20px 20px;">
<table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center" data-template-block="social" style="margin:0 auto;">
<tr>
<td style="padding:0 4px;vertical-align:middle;">
<a href="https://instagram.com/" title="Instagram" style="display:inline-block;padding:8px;border-radius:50%;background:#737373;line-height:0;text-decoration:none;">
<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="#ffffff" aria-hidden="true"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 110 2.881 1.44 1.44 0 010-2.881z"/></svg>
</a>
</td>
<td style="padding:0 4px;vertical-align:middle;">
<a href="https://x.com/" title="X" style="display:inline-block;padding:8px;border-radius:50%;background:#737373;line-height:0;text-decoration:none;">
<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="#ffffff" aria-hidden="true"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
</a>
</td>
<td style="padding:0 4px;vertical-align:middle;">
<a href="https://facebook.com/" title="Facebook" style="display:inline-block;padding:8px;border-radius:50%;background:#737373;line-height:0;text-decoration:none;">
<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="#ffffff" aria-hidden="true"><path d="M9.101 23.691v-9.223H6.077v-3.168h3.024V8.995c0-3.1 1.877-4.8 4.652-4.8 1.32 0 2.458.099 2.789.143v3.24h-1.915c-1.503 0-1.793.716-1.793 1.763v2.313h3.587l-.467 3.168h-3.12V23.69H9.101z"/></svg>
</a>
</td>
<td style="padding:0 4px;vertical-align:middle;">
<a href="https://www.google.com/" title="Web" style="display:inline-block;padding:8px;border-radius:50%;background:#737373;line-height:0;text-decoration:none;">
<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
</a>
</td>
</tr>
</table>
</td>
</tr>
</tbody>
</table>
</td>
</tr>
</table>`;

export const TEMPLATE_SHORT_CODES = [
  { token: "{{site_url}}", description: "Your public site base URL (no trailing slash), used for links like referrals and blog." },
  { token: "{{email_body}}", description: "Slot where the main email message is inserted when sending (if your flow supports it)." },
  { token: "{{customer_name}}", description: "Displays the customer's full name." },
  { token: "{{business_name}}", description: "Displays your business/store name." },
  { token: "{{business_logo_url}}", description: "Displays your business logo URL (for use in an HTML img src)." },
  { token: "{{support_email}}", description: "Displays your business support email address." },
  { token: "{{support_phone}}", description: "Displays your business support phone number." },
  { token: "{{store_currency}}", description: "Displays your store currency code (for example: USD)." },
  { token: "{{service}}", description: "Displays the booked service name." },
  { token: "{{date}}", description: "Displays the booking date." },
  { token: "{{time}}", description: "Displays the booking time." },
  { token: "{{address}}", description: "Displays the booking location/address." },
  { token: "{{booking_ref}}", description: "Displays the booking reference code." },
  { token: "{{total_price}}", description: "Displays the booking total as a plain number." },
  { token: "{{total_price_formatted}}", description: "Displays the booking total with currency symbol." },
  { token: "{{invoice_number}}", description: "Displays the invoice number." },
  { token: "{{total_amount}}", description: "Displays the invoice total as a plain number." },
  { token: "{{total_amount_formatted}}", description: "Displays the invoice total with currency symbol." },
  { token: "{{due_date}}", description: "Displays the invoice due date." },
  { token: "{{issue_date}}", description: "Displays the invoice issue date." },
  { token: "{{description}}", description: "Displays invoice notes/description text." },
  { token: "{{line_summary}}", description: "Displays a short invoice line summary." },
  { token: "{{view_url}}", description: "Displays the customer invoice link URL." },
] as const;