import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';
import {
  plainTextToEmailHtml,
  resolvePublicAssetUrls,
  substituteEmailPlaceholders,
} from '@/lib/emailTemplatePlaceholders';
import {
  getActivePlatformEmailTemplateByKey,
  PLATFORM_EMAIL_TEMPLATE_KEYS,
} from '@/lib/platformEmailTemplates';

/** Public site base URL for template placeholders like {{site_url}}/blog */
function resolveSiteUrl(website?: string | null): string {
  const w = (website ?? '').trim();
  if (w && /^https?:\/\//i.test(w)) return w.replace(/\/$/, '');
  const app = (process.env.NEXT_PUBLIC_APP_URL || 'https://yourdomain.com').trim();
  return app.replace(/\/$/, '');
}

/** Business name + contact lines for customer-facing booking and receipt emails */
function businessContactFooterHtml(
  businessName: string,
  supportEmail?: string | null,
  supportPhone?: string | null
): string {
  const email = (supportEmail ?? '').trim();
  const phone = (supportPhone ?? '').trim();
  const style =
    'margin-top:24px;padding-top:16px;border-top:1px solid #e0e0e0;font-size:14px;color:#444;line-height:1.5;';
  let inner = `<p style="margin:0 0 8px;"><strong>${businessName}</strong></p>`;
  if (email) {
    inner += `<p style="margin:4px 0;"><strong>Email:</strong> <a href="mailto:${email}">${email}</a></p>`;
  }
  if (phone) {
    inner += `<p style="margin:4px 0;"><strong>Phone:</strong> ${phone}</p>`;
  }
  return `<div style="${style}">${inner}</div>`;
}

function formatBookingScheduleForEmail(
  scheduledDate: string | null,
  scheduledTime: string | null
): { dateStr: string; timeStr: string } {
  const dateStr = scheduledDate
    ? new Date(scheduledDate + "T00:00:00").toLocaleDateString("en-US", {
        weekday: "long",
        month: "long",
        day: "numeric",
        year: "numeric",
      })
    : "TBD";
  const timeStr = scheduledTime
    ? String(scheduledTime).includes(":")
      ? String(scheduledTime).slice(0, 5)
      : String(scheduledTime)
    : "";
  return { dateStr, timeStr };
}

function appendBusinessContactBeforeBodyClose(
  emailHtml: string,
  businessName: string,
  supportEmail?: string | null,
  supportPhone?: string | null
): string {
  const contactFooter = businessContactFooterHtml(businessName, supportEmail, supportPhone);
  if (/<\/body>/i.test(emailHtml)) {
    return emailHtml.replace(/<\/body>/i, `${contactFooter}</body>`);
  }
  return emailHtml + contactFooter;
}

interface ProviderInvitationData {
  email: string;
  firstName: string;
  lastName: string;
  businessName: string;
  invitationToken: string;
  tempPassword?: string;
}

interface StaffInvitationData {
  email: string;
  firstName: string;
  lastName: string;
  businessName: string;
  invitationToken: string;
}

export class EmailService {
  private supabaseAdmin: any;
  private resendClient: Resend | null;

  constructor() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!supabaseUrl || !supabaseServiceRoleKey) {
      throw new Error('Missing Supabase configuration for email service');
    }

    this.supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey);

    // Initialize Resend
    if (process.env.RESEND_API_KEY) {
      this.resendClient = new Resend(process.env.RESEND_API_KEY);
    } else {
      this.resendClient = null;
    }
  }

  async sendProviderInvitation(data: ProviderInvitationData): Promise<boolean> {
    try {
      const { email, firstName, lastName, businessName, invitationToken } = data;
      
      // Create invitation URL
      const invitationUrl = `${process.env.NEXT_PUBLIC_APP_URL?.replace('http://localhost:3000', 'https://yourdomain.com') || 'https://yourdomain.com'}/provider/invite?token=${invitationToken}&email=${encodeURIComponent(email)}`;
      
      // Email template
      const emailSubject = `You're Invited to Join ${businessName} as a Service Provider`;
      
      const emailHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Provider Invitation</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 10px 10px 0 0; text-align: center; }
            .content { background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px; }
            .button { display: inline-block; background: linear-gradient(135deg, #00BCD4 0%, #00D4E8 100%); color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
            .footer { text-align: center; color: #666; margin-top: 30px; font-size: 14px; }
            .highlight { background: #e3f2fd; padding: 15px; border-left: 4px solid #2196f3; margin: 20px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🎉 Welcome to Team!</h1>
              <p>You're invited to join ${businessName}</p>
            </div>
            
            <div class="content">
              <p>Hi ${firstName} ${lastName},</p>
              
              <p>We're excited to invite you to join ${businessName} as a Service Provider! You've been selected to join our team of professionals.</p>
              
              <div class="highlight">
                <strong>Next Steps:</strong><br>
                1. Click button below to accept invitation<br>
                2. Set up your secure password<br>
                3. Complete your profile<br>
                4. Start receiving job assignments
              </div>
              
              <div style="text-align: center;">
                <a href="${invitationUrl}" class="button">
                  Accept Invitation & Set Password
                </a>
              </div>
              
              <p><strong>Important:</strong></p>
              <ul>
                <li>This invitation link expires in 7 days</li>
                <li>You'll need to set up your password to access the provider portal</li>
                <li>Once registered, you can manage your schedule, view assignments, and track earnings</li>
              </ul>
              
              <p>If you have any questions, please contact our support team.</p>
              
              <p>We look forward to working with you!</p>
              
              <p>Best regards,<br>
              The ${businessName} Team</p>
            </div>
            
            <div class="footer">
              <p>This is an automated message. Please do not reply to this email.</p>
              <p>If you didn't expect this invitation, please ignore this email.</p>
            </div>
          </div>
        </body>
        </html>
      `;

      // Check if Resend is configured
      if (!this.resendClient) {
        console.log('=== RESEND NOT CONFIGURED - FALLBACK TO CONSOLE ===');
        console.log('To:', email);
        console.log('Subject:', emailSubject);
        console.log('Invitation URL:', invitationUrl);
        console.log('Email HTML length:', emailHtml.length, 'characters');
        console.log('==============================================');
        return true; // Simulate success for development
      }

      // Send email using Resend
      try {
        const { data, error } = await this.resendClient.emails.send({
          from: process.env.RESEND_FROM_EMAIL || 'noreply@yourdomain.com',
          to: [email],
          subject: emailSubject,
          html: emailHtml,
        });

        if (error) {
          console.error('Resend error:', error);
          return false;
        }

        console.log('✅ Resend email sent successfully:', data.id);
        return true;
      } catch (resendError) {
        console.error('Resend error:', resendError);
        
        // Fallback to console logging
        console.log('=== RESEND FAILED - FALLBACK TO CONSOLE ===');
        console.log('To:', email);
        console.log('Subject:', emailSubject);
        console.log('Invitation URL:', invitationUrl);
        console.log('==============================================');
        
        return false;
      }
      
    } catch (error) {
      console.error('Email service error:', error);
      return false;
    }
  }

  async sendStaffInvitation(data: StaffInvitationData): Promise<boolean> {
    try {
      const { email, firstName, lastName, businessName, invitationToken } = data;
      const base = resolveSiteUrl();
      const invitationUrl = `${base}/auth/staff-invite?token=${encodeURIComponent(invitationToken)}&email=${encodeURIComponent(email)}`;
      const emailSubject = `You're invited to join ${businessName} on Orbyt (staff account)`;

      const emailHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Staff invitation</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #00BCD4 0%, #00838F 100%); color: white; padding: 30px; border-radius: 10px 10px 0 0; text-align: center; }
            .content { background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px; }
            .button { display: inline-block; background: #00ACC1; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
            .footer { text-align: center; color: #666; margin-top: 30px; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Team invitation</h1>
              <p>${businessName}</p>
            </div>
            <div class="content">
              <p>Hi ${firstName} ${lastName},</p>
              <p>You've been invited to access the <strong>admin dashboard</strong> for <strong>${businessName}</strong>.</p>
              <p>Click the button below to create your password and activate your account.</p>
              <div style="text-align: center;">
                <a href="${invitationUrl}" class="button">Set password &amp; join</a>
              </div>
              <p style="font-size: 14px; color: #555;">This link expires in 30 days. If you didn't expect this email, you can ignore it.</p>
            </div>
            <div class="footer">
              <p>Automated message from Orbyt.</p>
            </div>
          </div>
        </body>
        </html>
      `;

      if (!this.resendClient) {
        console.log('=== STAFF INVITE (Resend not configured) ===');
        console.log('To:', email);
        console.log('Invitation URL:', invitationUrl);
        return true;
      }

      const { error } = await this.resendClient.emails.send({
        from: process.env.RESEND_FROM_EMAIL || 'noreply@yourdomain.com',
        to: [email],
        subject: emailSubject,
        html: emailHtml,
      });
      if (error) {
        console.error('Resend staff invite error:', error);
        return false;
      }
      return true;
    } catch (e) {
      console.error('sendStaffInvitation error:', e);
      return false;
    }
  }

  async sendProviderWelcomeEmail(email: string, firstName: string, businessName: string): Promise<boolean> {
    try {
      const emailSubject = `Welcome to ${businessName} - Your Provider Account is Ready!`;
      
      const emailHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Welcome Email</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #4caf50 0%, #45a049 100%); color: white; padding: 30px; border-radius: 10px 10px 0 0; text-align: center; }
            .content { background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px; }
            .button { display: inline-block; background: linear-gradient(135deg, #4caf50 0%, #45a049 100%); color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
            .footer { text-align: center; color: #666; margin-top: 30px; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🎊 Welcome Aboard!</h1>
              <p>Your provider account is now active</p>
            </div>
            
            <div class="content">
              <p>Hi ${firstName},</p>
              
              <p>Congratulations! Your provider account with ${businessName} is now ready to use.</p>
              
              <div style="text-align: center;">
                <a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/provider/login" class="button">
                  Go to Provider Portal
                </a>
              </div>
              
              <p><strong>What you can do now:</strong></p>
              <ul>
                <li>View and manage your profile</li>
                <li>Set your availability and schedule</li>
                <li>Accept job assignments</li>
                <li>Track your earnings and performance</li>
                <li>Communicate with customers</li>
              </ul>
              
              <p>If you have any questions or need assistance, don't hesitate to reach out to our support team.</p>
              
              <p>We're excited to have you as part of our team!</p>
              
              <p>Best regards,<br>
              The ${businessName} Team</p>
            </div>
            
            <div class="footer">
              <p>This is an automated message. Please do not reply to this email.</p>
            </div>
          </div>
        </body>
        </html>
      `;

      // Check if Resend is configured
      if (!this.resendClient) {
        console.log('=== RESEND NOT CONFIGURED - FALLBACK TO CONSOLE ===');
        console.log('To:', email);
        console.log('Subject:', emailSubject);
        console.log('==============================================');
        return true; // Simulate success for development
      }

      // Send email using Resend
      try {
        const { data, error } = await this.resendClient.emails.send({
          from: process.env.RESEND_FROM_EMAIL || 'noreply@yourdomain.com',
          to: [email],
          subject: emailSubject,
          html: emailHtml,
        });

        if (error) {
          console.error('Resend error:', error);
          return false;
        }

        console.log('✅ Resend welcome email sent successfully:', data.id);
        return true;
      } catch (resendError) {
        console.error('Resend error:', resendError);
        
        // Fallback to console logging
        console.log('=== RESEND FAILED - FALLBACK TO CONSOLE ===');
        console.log('To:', email);
        console.log('Subject:', emailSubject);
        console.log('==============================================');
        
        return false;
      }
      
    } catch (error) {
      console.error('Welcome email error:', error);
        return false;
    }
  }

  async sendInvoice(data: {
    to: string;
    customerName: string;
    businessName: string;
    businessWebsite?: string | null;
    businessLogoUrl?: string | null;
    supportEmail?: string | null;
    supportPhone?: string | null;
    storeCurrency?: string | null;
    invoiceNumber: string;
    totalAmount: number;
    dueDate: string | null;
    issueDate: string;
    description?: string | null;
    viewUrl: string;
    lineSummary?: string;
  }): Promise<boolean> {
    try {
      const {
        to,
        customerName,
        businessName,
        businessLogoUrl,
        supportEmail,
        supportPhone,
        storeCurrency,
        invoiceNumber,
        totalAmount,
        dueDate,
        issueDate,
        description,
        viewUrl,
        lineSummary,
      } = data;
      const defaultSubject = `Invoice ${invoiceNumber} from ${businessName}`;

      const tpl = await getActivePlatformEmailTemplateByKey(PLATFORM_EMAIL_TEMPLATE_KEYS.invoice);
      if (tpl) {
        const vars = {
          customer_name: customerName,
          business_name: businessName,
          invoice_number: invoiceNumber,
          total_amount: totalAmount.toFixed(2),
          total_amount_formatted: `$${totalAmount.toFixed(2)}`,
          due_date: dueDate || '',
          issue_date: issueDate,
          description: description || '',
          line_summary: lineSummary || '',
          view_url: viewUrl,
          business_logo_url: businessLogoUrl || '',
          support_email: supportEmail || '',
          support_phone: supportPhone || '',
          store_currency: storeCurrency || '',
          site_url: resolveSiteUrl(businessWebsite),
        };
        const emailSubject =
          substituteEmailPlaceholders((tpl.subject || '').trim(), vars).trim() || defaultSubject;
        const bodyHtmlRaw = (tpl.body_html || '').trim();
        const bodyTextRaw = tpl.body_text || '';
        let emailHtml: string;
        if (bodyHtmlRaw) {
          emailHtml = substituteEmailPlaceholders(bodyHtmlRaw, vars);
        } else if (bodyTextRaw) {
          emailHtml = plainTextToEmailHtml(substituteEmailPlaceholders(bodyTextRaw, vars));
        } else {
          emailHtml = '';
        }
        if (emailHtml) {
          emailHtml = resolvePublicAssetUrls(emailHtml, resolveSiteUrl(businessWebsite));
          if (!this.resendClient) {
            console.log('[Email] Invoice (template, Resend not configured):', to, invoiceNumber);
            return true;
          }
          const { error } = await this.resendClient.emails.send({
            from: process.env.RESEND_FROM_EMAIL || 'noreply@yourdomain.com',
            to: [to],
            subject: emailSubject,
            html: emailHtml,
          });
          if (error) {
            console.error('Resend error (invoice template):', error);
            return false;
          }
          return true;
        }
      }

      const emailSubject = defaultSubject;

      const emailHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Invoice</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #00BCD4 0%, #00D4E8 100%); color: white; padding: 30px; border-radius: 10px 10px 0 0; text-align: center; }
            .content { background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px; }
            .amount { font-size: 24px; font-weight: bold; color: #00BCD4; margin: 20px 0; }
            .button { display: inline-block; background: linear-gradient(135deg, #00BCD4 0%, #00D4E8 100%); color: white !important; padding: 15px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
            .footer { text-align: center; color: #666; margin-top: 30px; font-size: 14px; }
            .detail { margin: 8px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Invoice ${invoiceNumber}</h1>
              <p>from ${businessName}</p>
            </div>
            <div class="content">
              <p>Hi ${customerName},</p>
              <p>Please find your invoice details below:</p>
              <div class="detail"><strong>Invoice #:</strong> ${invoiceNumber}</div>
              <div class="detail"><strong>Issue date:</strong> ${issueDate}</div>
              ${dueDate ? `<div class="detail"><strong>Due date:</strong> ${dueDate}</div>` : ''}
              <div class="amount">Amount due: $${totalAmount.toFixed(2)}</div>
              ${lineSummary ? `<div class="detail">${lineSummary}</div>` : ''}
              ${description ? `<p>${description}</p>` : ''}
              <div style="text-align: center;">
                <a href="${viewUrl}" class="button">View invoice</a>
              </div>
              <p>Thank you for your business.</p>
              <p>Best regards,<br>${businessName}</p>
            </div>
            <div class="footer">
              <p>This is an automated message. Please do not reply to this email.</p>
            </div>
          </div>
        </body>
        </html>
      `;

      if (!this.resendClient) {
        console.log('=== RESEND NOT CONFIGURED - FALLBACK TO CONSOLE ===');
        console.log('To:', to);
        console.log('Subject:', emailSubject);
        console.log('View URL:', viewUrl);
        console.log('==============================================');
        return true;
      }

      const { error } = await this.resendClient.emails.send({
        from: process.env.RESEND_FROM_EMAIL || 'noreply@yourdomain.com',
        to: [to],
        subject: emailSubject,
        html: emailHtml,
      });

      if (error) {
        console.error('Resend error:', error);
        return false;
      }
      return true;
    } catch (error) {
      console.error('Invoice email error:', error);
      return false;
    }
  }

  /**
   * Pending / request-received email (customer or guest book-now, not yet confirmed).
   * Uses platform template key `booking_pending_request` when configured.
   */
  async sendBookingPendingEmail(data: {
    to: string;
    customerName: string;
    businessName: string;
    businessWebsite?: string | null;
    businessLogoUrl?: string | null;
    supportEmail?: string | null;
    supportPhone?: string | null;
    storeCurrency?: string | null;
    service: string | null;
    scheduledDate: string | null;
    scheduledTime: string | null;
    address: string | null;
    totalPrice: number;
    bookingRef: string;
    awaitingOnlinePayment?: boolean;
    /**
     * `scheduled` matches customer portal wording (DB `pending` shown as “scheduled”).
     * Same platform template key `booking_pending_request`; only default subject/body copy differs when no custom template.
     */
    copyVariant?: 'pending' | 'scheduled';
    /** After online checkout: row can be `pending` but `payment_status` is already `paid`; do not ask for payment again. */
    paymentAlreadyReceived?: boolean;
  }): Promise<boolean> {
    try {
      const {
        to,
        customerName,
        businessName,
        businessWebsite,
        businessLogoUrl,
        supportEmail,
        supportPhone,
        storeCurrency,
        service,
        scheduledDate,
        scheduledTime,
        address,
        totalPrice,
        bookingRef,
        awaitingOnlinePayment = false,
        copyVariant = 'pending',
        paymentAlreadyReceived = false,
      } = data;
      const { dateStr, timeStr } = formatBookingScheduleForEmail(scheduledDate, scheduledTime);
      const useScheduledCopy = copyVariant === 'scheduled' && !awaitingOnlinePayment;
      const paidPending = paymentAlreadyReceived && !awaitingOnlinePayment;
      /** Pay-first book-now: booking is only complete after Stripe (intended flow, not a missing payment). */
      const defaultSubject = awaitingOnlinePayment
        ? `Complete your booking with ${businessName}`
        : paidPending
          ? `Payment successful: booking being finalized - ${businessName}`
          : useScheduledCopy
            ? `Appointment scheduled - ${businessName}`
            : `Booking request received - ${businessName}`;
      const bookingStatusLabel = awaitingOnlinePayment
        ? 'Secure checkout: finish to complete your booking'
        : paidPending
          ? 'Payment successful - awaiting assignment or final confirmation'
          : useScheduledCopy
            ? 'Scheduled - not yet confirmed'
            : 'Pending - not yet confirmed';
      const introParagraph = awaitingOnlinePayment
        ? `Thank you for choosing ${businessName}. Your visit is saved, but the booking is not complete until payment goes through. This is how we secure your spot. Please finish paying on the secure checkout page (use the same browser window, or open book again from the site if you closed it). When payment succeeds, we will email you again with your booking details.`
        : paidPending
          ? `Your payment was successful. Thank you. No further payment is needed. Your booking below is still being finalized while ${businessName} assigns a provider or confirms your visit. You will receive another email when your booking is fully confirmed.`
          : useScheduledCopy
            ? `Your appointment with ${businessName} is scheduled for the date and time below. It is not fully confirmed yet; ${businessName} will confirm it or contact you if anything needs to change.`
            : `We received your booking request with ${businessName}. Your appointment is still pending and is not confirmed yet. ${businessName} will confirm it or contact you if anything needs to change.`;

      const tpl = await getActivePlatformEmailTemplateByKey(
        PLATFORM_EMAIL_TEMPLATE_KEYS.bookingPendingRequest
      );
      if (tpl) {
        const vars = {
          customer_name: customerName,
          business_name: businessName,
          service: service || '',
          date: dateStr,
          time: timeStr,
          address: address || '',
          total_price: Number(totalPrice || 0).toFixed(2),
          total_price_formatted: `$${Number(totalPrice || 0).toFixed(2)}`,
          booking_ref: bookingRef,
          business_logo_url: businessLogoUrl || '',
          support_email: supportEmail || '',
          support_phone: supportPhone || '',
          store_currency: storeCurrency || '',
          site_url: resolveSiteUrl(businessWebsite),
          awaiting_online_payment: awaitingOnlinePayment ? 'yes' : 'no',
          payment_received: paidPending ? 'yes' : 'no',
          booking_status_label: bookingStatusLabel,
          intro_paragraph: introParagraph,
        };
        const emailSubject =
          substituteEmailPlaceholders((tpl.subject || '').trim(), vars).trim() || defaultSubject;
        const bodyHtmlRaw = (tpl.body_html || '').trim();
        const bodyTextRaw = tpl.body_text || '';
        let emailHtml: string;
        if (bodyHtmlRaw) {
          emailHtml = substituteEmailPlaceholders(bodyHtmlRaw, vars);
        } else if (bodyTextRaw) {
          emailHtml = plainTextToEmailHtml(substituteEmailPlaceholders(bodyTextRaw, vars));
        } else {
          emailHtml = '';
        }
        if (emailHtml) {
          emailHtml = resolvePublicAssetUrls(emailHtml, resolveSiteUrl(businessWebsite));
          emailHtml = appendBusinessContactBeforeBodyClose(
            emailHtml,
            businessName,
            supportEmail,
            supportPhone
          );
          if (!this.resendClient) {
            console.log('[Email] Booking pending (template, Resend not configured):', to, bookingRef);
            return true;
          }
          const { error } = await this.resendClient.emails.send({
            from: process.env.RESEND_FROM_EMAIL || 'noreply@yourdomain.com',
            to: [to],
            subject: emailSubject,
            html: emailHtml,
          });
          if (error) {
            console.error('Booking pending email error (template):', error);
            return false;
          }
          return true;
        }
      }

      const headerTitle = awaitingOnlinePayment
        ? 'Almost done: complete payment'
        : paidPending
          ? 'Payment successful'
          : useScheduledCopy
            ? 'Appointment scheduled'
            : 'Booking request received';
      const emailHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Booking request</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #00BCD4 0%, #00D4E8 100%); color: white; padding: 30px; border-radius: 10px 10px 0 0; text-align: center; }
            .content { background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px; }
            .detail { background: white; padding: 16px; border-radius: 8px; margin: 16px 0; border-left: 4px solid #00BCD4; }
            .status { display: inline-block; background: #fff3cd; color: #856404; padding: 6px 12px; border-radius: 6px; font-size: 14px; font-weight: 600; margin-bottom: 12px; }
            .footer { text-align: center; color: #666; margin-top: 30px; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>${headerTitle}</h1>
              <p>Reference: ${bookingRef}</p>
            </div>
            <div class="content">
              <p>Hi ${customerName},</p>
              <p class="status">${bookingStatusLabel}</p>
              <p>${introParagraph}</p>
              <div class="detail">
                <p><strong>Service:</strong> ${service || 'Service'}</p>
                <p><strong>Date:</strong> ${dateStr}</p>
                ${timeStr ? `<p><strong>Time:</strong> ${timeStr}</p>` : ''}
                ${address ? `<p><strong>Address:</strong> ${address}</p>` : ''}
                <p><strong>Amount:</strong> $${Number(totalPrice || 0).toFixed(2)}</p>
              </div>
              <p>If you have any questions, please reach out using the contact details below.</p>
              ${businessContactFooterHtml(businessName, supportEmail, supportPhone)}
              <p>Thank you. We will be in touch if we need anything else.</p>
              <p>Best regards,<br>The ${businessName} Team</p>
            </div>
            <div class="footer">
              <p>This is an automated message. For questions about your booking, use the business contact details shown above.</p>
            </div>
          </div>
        </body>
        </html>
      `;

      if (!this.resendClient) {
        console.log('[Email] Booking pending (Resend not configured):', to, bookingRef);
        return true;
      }
      const { error } = await this.resendClient.emails.send({
        from: process.env.RESEND_FROM_EMAIL || 'noreply@yourdomain.com',
        to: [to],
        subject: defaultSubject,
        html: emailHtml,
      });
      if (error) {
        console.error('Booking pending email error:', error);
        return false;
      }
      return true;
    } catch (e) {
      console.error('sendBookingPendingEmail error:', e);
      return false;
    }
  }

  /**
   * Confirmed booking email (e.g. after payment or admin confirmation). Includes assigned provider when provided.
   * Uses platform template key `booking_confirmation` when configured.
   */
  /**
   * Sends only when the booking is actually confirmed (callers should pass details for a `confirmed` row).
   * Platform template: `booking_confirmation`.
   */
  async sendBookingConfirmedEmail(data: {
    to: string;
    customerName: string;
    businessName: string;
    businessWebsite?: string | null;
    businessLogoUrl?: string | null;
    supportEmail?: string | null;
    supportPhone?: string | null;
    storeCurrency?: string | null;
    service: string | null;
    scheduledDate: string | null;
    scheduledTime: string | null;
    address: string | null;
    totalPrice: number;
    bookingRef: string;
    providerName?: string | null;
    providerPhone?: string | null;
  }): Promise<boolean> {
    try {
      const {
        to,
        customerName,
        businessName,
        businessWebsite,
        businessLogoUrl,
        supportEmail,
        supportPhone,
        storeCurrency,
        service,
        scheduledDate,
        scheduledTime,
        address,
        totalPrice,
        bookingRef,
        providerName,
        providerPhone,
      } = data;
      const { dateStr, timeStr } = formatBookingScheduleForEmail(scheduledDate, scheduledTime);
      const defaultSubject = `Booking Confirmed - ${businessName}`;
      const pn = (providerName ?? '').trim();
      const pp = (providerPhone ?? '').trim();
      const hasProvider = Boolean(pn);
      const introParagraph = `Your booking with ${businessName} has been confirmed.`;
      const providerBlockHtml = hasProvider
        ? `<div class="detail provider">
            <p><strong>Assigned provider:</strong> ${pn}</p>
            ${pp ? `<p><strong>Provider phone:</strong> ${pp}</p>` : ''}
          </div>`
        : `<p style="color:#555;font-size:15px;">Your service professional will be assigned soon. ${businessName} will contact you if anything changes.</p>`;

      const tpl = await getActivePlatformEmailTemplateByKey(PLATFORM_EMAIL_TEMPLATE_KEYS.bookingConfirmation);
      if (tpl) {
        const vars = {
          customer_name: customerName,
          business_name: businessName,
          service: service || '',
          date: dateStr,
          time: timeStr,
          address: address || '',
          total_price: Number(totalPrice || 0).toFixed(2),
          total_price_formatted: `$${Number(totalPrice || 0).toFixed(2)}`,
          booking_ref: bookingRef,
          business_logo_url: businessLogoUrl || '',
          support_email: supportEmail || '',
          support_phone: supportPhone || '',
          store_currency: storeCurrency || '',
          site_url: resolveSiteUrl(businessWebsite),
          booking_status_label: 'Confirmed',
          intro_paragraph: introParagraph,
          provider_name: pn,
          provider_phone: pp,
          has_assigned_provider: hasProvider ? 'yes' : 'no',
        };
        const emailSubject =
          substituteEmailPlaceholders((tpl.subject || '').trim(), vars).trim() || defaultSubject;
        const bodyHtmlRaw = (tpl.body_html || '').trim();
        const bodyTextRaw = tpl.body_text || '';
        let emailHtml: string;
        if (bodyHtmlRaw) {
          emailHtml = substituteEmailPlaceholders(bodyHtmlRaw, vars);
        } else if (bodyTextRaw) {
          emailHtml = plainTextToEmailHtml(substituteEmailPlaceholders(bodyTextRaw, vars));
        } else {
          emailHtml = '';
        }
        if (emailHtml) {
          emailHtml = resolvePublicAssetUrls(emailHtml, resolveSiteUrl(businessWebsite));
          emailHtml = appendBusinessContactBeforeBodyClose(
            emailHtml,
            businessName,
            supportEmail,
            supportPhone
          );
          if (!this.resendClient) {
            console.log('[Email] Booking confirmed (template, Resend not configured):', to, bookingRef);
            return true;
          }
          const { error } = await this.resendClient.emails.send({
            from: process.env.RESEND_FROM_EMAIL || 'noreply@yourdomain.com',
            to: [to],
            subject: emailSubject,
            html: emailHtml,
          });
          if (error) {
            console.error('Booking confirmed email error (template):', error);
            return false;
          }
          return true;
        }
      }

      const emailHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Booking Confirmed</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #00BCD4 0%, #00D4E8 100%); color: white; padding: 30px; border-radius: 10px 10px 0 0; text-align: center; }
            .content { background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px; }
            .detail { background: white; padding: 16px; border-radius: 8px; margin: 16px 0; border-left: 4px solid #00BCD4; }
            .detail.provider { border-left-color: #00838f; }
            .status { display: inline-block; background: #e8f5e9; color: #2e7d32; padding: 6px 12px; border-radius: 6px; font-size: 14px; font-weight: 600; margin-bottom: 12px; }
            .footer { text-align: center; color: #666; margin-top: 30px; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>✓ Booking Confirmed</h1>
              <p>Reference: ${bookingRef}</p>
            </div>
            <div class="content">
              <p>Hi ${customerName},</p>
              <p class="status">Confirmed</p>
              <p>${introParagraph}</p>
              <div class="detail">
                <p><strong>Service:</strong> ${service || 'Service'}</p>
                <p><strong>Date:</strong> ${dateStr}</p>
                ${timeStr ? `<p><strong>Time:</strong> ${timeStr}</p>` : ''}
                ${address ? `<p><strong>Address:</strong> ${address}</p>` : ''}
                <p><strong>Amount:</strong> $${Number(totalPrice || 0).toFixed(2)}</p>
              </div>
              ${providerBlockHtml}
              <p>If you have any questions, please reach out using the contact details below.</p>
              ${businessContactFooterHtml(businessName, supportEmail, supportPhone)}
              <p>Thank you for your booking!</p>
              <p>Best regards,<br>The ${businessName} Team</p>
            </div>
            <div class="footer">
              <p>This is an automated message. For questions about your booking, use the business contact details shown above.</p>
            </div>
          </div>
        </body>
        </html>
      `;

      if (!this.resendClient) {
        console.log('[Email] Booking confirmed (Resend not configured):', to, bookingRef);
        return true;
      }
      const { error } = await this.resendClient.emails.send({
        from: process.env.RESEND_FROM_EMAIL || 'noreply@yourdomain.com',
        to: [to],
        subject: defaultSubject,
        html: emailHtml,
      });
      if (error) {
        console.error('Booking confirmed email error:', error);
        return false;
      }
      return true;
    } catch (e) {
      console.error('sendBookingConfirmedEmail error:', e);
      return false;
    }
  }

  /**
   * Send payment receipt after successful charge
   */
  async sendReceiptEmail(data: {
    to: string;
    customerName: string;
    businessName: string;
    service: string | null;
    amount: number;
    bookingRef: string;
    paymentMethod?: 'card' | 'cash' | 'check';
    /** Business contact email (e.g. businesses.business_email) */
    supportEmail?: string | null;
    supportPhone?: string | null;
  }): Promise<boolean> {
    try {
      const {
        to,
        customerName,
        businessName,
        service,
        amount,
        bookingRef,
        paymentMethod = 'card',
        supportEmail,
        supportPhone,
      } = data;
      const emailSubject = `Payment Receipt - ${businessName}`;
      const emailHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Payment Receipt</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #4caf50 0%, #45a049 100%); color: white; padding: 30px; border-radius: 10px 10px 0 0; text-align: center; }
            .content { background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px; }
            .amount { font-size: 24px; font-weight: bold; color: #4caf50; margin: 20px 0; }
            .footer { text-align: center; color: #666; margin-top: 30px; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Thank You for Your Payment</h1>
              <p>Receipt for booking ${bookingRef}</p>
            </div>
            <div class="content">
              <p>Hi ${customerName},</p>
              <p>We've received your payment for the following service:</p>
              <p><strong>Service:</strong> ${service || 'Service'}</p>
              <div class="amount">Amount paid: $${Number(amount || 0).toFixed(2)}</div>
              <p><strong>Payment method:</strong> ${paymentMethod === 'cash' || paymentMethod === 'check' ? 'Cash/Check' : 'Card'}</p>
              <p>Thank you for choosing ${businessName}!</p>
              ${businessContactFooterHtml(businessName, supportEmail, supportPhone)}
              <p>Best regards,<br>The ${businessName} Team</p>
            </div>
            <div class="footer">
              <p>This is an automated receipt. Please use the business contact details above for questions about this charge.</p>
            </div>
          </div>
        </body>
        </html>
      `;

      if (!this.resendClient) {
        console.log('[Email] Receipt (Resend not configured):', to, bookingRef);
        return true;
      }
      const { error } = await this.resendClient.emails.send({
        from: process.env.RESEND_FROM_EMAIL || 'noreply@yourdomain.com',
        to: [to],
        subject: emailSubject,
        html: emailHtml,
      });
      if (error) {
        console.error('Receipt email error:', error);
        return false;
      }
      return true;
    } catch (e) {
      console.error('sendReceiptEmail error:', e);
      return false;
    }
  }

  /**
   * Send secure payment link for an existing booking (Booking Charges → pay online).
   */
  async sendPaymentLinkEmail(data: {
    to: string;
    customerName: string;
    businessName: string;
    service: string | null;
    amount: number;
    bookingRef: string;
    paymentUrl: string;
  }): Promise<boolean> {
    try {
      const { to, customerName, businessName, service, amount, bookingRef, paymentUrl } = data;
      const emailSubject = `Pay for your service - ${businessName}`;
      const emailHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Complete your payment</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #00BCD4 0%, #0097A7 100%); color: white; padding: 28px; border-radius: 10px 10px 0 0; text-align: center; }
            .content { background: #f8f9fa; padding: 28px; border-radius: 0 0 10px 10px; }
            .button { display: inline-block; background: #00BCD4; color: white !important; padding: 14px 28px; text-decoration: none; border-radius: 6px; margin: 20px 0; font-weight: 600; }
            .amount { font-size: 22px; font-weight: bold; color: #0097A7; margin: 16px 0; }
            .footer { text-align: center; color: #666; margin-top: 24px; font-size: 14px; }
            .muted { color: #666; font-size: 14px; word-break: break-all; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1 style="margin:0;font-size:22px;">Complete your payment</h1>
              <p style="margin:8px 0 0;opacity:0.95;">${bookingRef}</p>
            </div>
            <div class="content">
              <p>Hi ${customerName},</p>
              <p>${businessName} has sent you a secure link to pay for your completed service.</p>
              <p><strong>Service:</strong> ${service || 'Service'}</p>
              <div class="amount">Amount due: $${Number(amount || 0).toFixed(2)}</div>
              <div style="text-align: center;">
                <a href="${paymentUrl}" class="button">Pay securely</a>
              </div>
              <p class="muted">If the button doesn’t work, copy and paste this link into your browser:<br>${paymentUrl}</p>
              <p>Thank you,<br>The ${businessName} Team</p>
            </div>
            <div class="footer">
              <p>This is an automated message. Please do not reply to this email.</p>
            </div>
          </div>
        </body>
        </html>
      `;

      if (!this.resendClient) {
        console.warn('[Email] Payment link not sent - RESEND_API_KEY is not set:', to, bookingRef);
        return false;
      }
      const { error } = await this.resendClient.emails.send({
        from: process.env.RESEND_FROM_EMAIL || 'noreply@yourdomain.com',
        to: [to],
        subject: emailSubject,
        html: emailHtml,
      });
      if (error) {
        console.error('Payment link email error:', error);
        return false;
      }
      return true;
    } catch (e) {
      console.error('sendPaymentLinkEmail error:', e);
      return false;
    }
  }

  /**
   * Send "never found provider" email when all providers decline or none available
   */
  async sendNeverFoundProviderEmail(data: {
    to: string;
    customerName: string;
    businessName: string;
    service: string | null;
    scheduledDate: string | null;
    scheduledTime: string | null;
    bookingRef: string;
  }): Promise<boolean> {
    try {
      const { to, customerName, businessName, service, scheduledDate, scheduledTime, bookingRef } = data;
      const dateStr = scheduledDate ? new Date(scheduledDate + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }) : 'your requested date';
      const timeStr = scheduledTime ? (String(scheduledTime).includes(':') ? String(scheduledTime).slice(0, 5) : String(scheduledTime)) : '';

      const emailSubject = `Update on Your Booking - ${businessName}`;
      const emailHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Booking Update</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #ff9800 0%, #f57c00 100%); color: white; padding: 30px; border-radius: 10px 10px 0 0; text-align: center; }
            .content { background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px; }
            .highlight { background: #fff3e0; padding: 16px; border-left: 4px solid #ff9800; margin: 20px 0; }
            .footer { text-align: center; color: #666; margin-top: 30px; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Booking Update</h1>
              <p>Reference: ${bookingRef}</p>
            </div>
            <div class="content">
              <p>Hi ${customerName},</p>
              <p>We wanted to let you know that we're currently unable to assign a service provider to your booking for <strong>${service || 'your service'}</strong> on ${dateStr}${timeStr ? ` at ${timeStr}` : ''}.</p>
              <div class="highlight">
                <p><strong>What happens next?</strong></p>
                <p>Our team is working to find a provider for your booking. We will reach out to you shortly with an update or alternative options.</p>
                <p>If you have any questions or would like to reschedule, please contact us directly.</p>
              </div>
              <p>We apologize for any inconvenience and thank you for your patience.</p>
              <p>Best regards,<br>The ${businessName} Team</p>
            </div>
            <div class="footer">
              <p>This is an automated message. Please do not reply to this email.</p>
            </div>
          </div>
        </body>
        </html>
      `;

      if (!this.resendClient) {
        console.log('[Email] Never found provider (Resend not configured):', to, bookingRef);
        return true;
      }
      const { error } = await this.resendClient.emails.send({
        from: process.env.RESEND_FROM_EMAIL || 'noreply@yourdomain.com',
        to: [to],
        subject: emailSubject,
        html: emailHtml,
      });
      if (error) {
        console.error('Never found provider email error:', error);
        return false;
      }
      return true;
    } catch (e) {
      console.error('sendNeverFoundProviderEmail error:', e);
      return false;
    }
  }

  /**
   * Send email to provider when a booking is assigned to them (new or reassigned).
   */
  async sendProviderBookingAssigned(data: {
    to: string;
    providerFirstName: string;
    businessName: string;
    service: string | null;
    scheduledDate: string | null;
    scheduledTime: string | null;
    address: string | null;
    customerName: string | null;
    bookingRef: string;
  }): Promise<boolean> {
    try {
      const {
        to,
        providerFirstName,
        businessName,
        service,
        scheduledDate,
        scheduledTime,
        address,
        customerName,
        bookingRef,
      } = data;

      const dateStr = scheduledDate
        ? new Date(scheduledDate + 'T00:00:00').toLocaleDateString('en-US', {
            weekday: 'long',
            month: 'long',
            day: 'numeric',
            year: 'numeric',
          })
        : 'TBD';
      const timeStr = scheduledTime
        ? String(scheduledTime).includes(':')
          ? String(scheduledTime).slice(0, 5)
          : String(scheduledTime)
        : '';

      const portalUrl =
        (process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000').replace(
          'http://localhost:3000',
          'https://yourdomain.com'
        ) + '/provider/bookings';

      const emailSubject = `New booking assigned to you - ${businessName}`;
      const emailHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Booking Assigned</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #00BCD4 0%, #00D4E8 100%); color: white; padding: 30px; border-radius: 10px 10px 0 0; text-align: center; }
            .content { background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px; }
            .detail { background: white; padding: 16px; border-radius: 8px; margin: 16px 0; border-left: 4px solid #00BCD4; }
            .button { display: inline-block; background: linear-gradient(135deg, #00BCD4 0%, #00D4E8 100%); color: white !important; padding: 15px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
            .footer { text-align: center; color: #666; margin-top: 30px; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>📅 New booking assigned</h1>
              <p>Reference: ${bookingRef}</p>
            </div>
            <div class="content">
              <p>Hi ${providerFirstName},</p>
              <p>A booking has been assigned to you at ${businessName}.</p>
              <div class="detail">
                <p><strong>Service:</strong> ${service || 'Service'}</p>
                <p><strong>Date:</strong> ${dateStr}</p>
                ${timeStr ? `<p><strong>Time:</strong> ${timeStr}</p>` : ''}
                ${address ? `<p><strong>Address:</strong> ${address}</p>` : ''}
                ${customerName ? `<p><strong>Customer:</strong> ${customerName}</p>` : ''}
              </div>
              <div style="text-align: center;">
                <a href="${portalUrl}" class="button">View in provider portal</a>
              </div>
              <p>Best regards,<br>The ${businessName} Team</p>
            </div>
            <div class="footer">
              <p>This is an automated message. Please do not reply to this email.</p>
            </div>
          </div>
        </body>
        </html>
      `;

      if (!this.resendClient) {
        console.log('[Email] Provider booking assigned (Resend not configured):', to, bookingRef);
        return true;
      }
      const { error } = await this.resendClient.emails.send({
        from: process.env.RESEND_FROM_EMAIL || 'noreply@yourdomain.com',
        to: [to],
        subject: emailSubject,
        html: emailHtml,
      });
      if (error) {
        console.error('Provider booking assigned email error:', error);
        return false;
      }
      console.log('✅ Provider booking assigned email sent:', to, bookingRef);
      return true;
    } catch (e) {
      console.error('sendProviderBookingAssigned error:', e);
      return false;
    }
  }
}
