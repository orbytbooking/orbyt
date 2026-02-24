import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';

interface ProviderInvitationData {
  email: string;
  firstName: string;
  lastName: string;
  businessName: string;
  invitationToken: string;
  tempPassword?: string;
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
    invoiceNumber: string;
    totalAmount: number;
    dueDate: string | null;
    issueDate: string;
    description?: string | null;
    viewUrl: string;
    lineSummary?: string;
  }): Promise<boolean> {
    try {
      const { to, customerName, businessName, invoiceNumber, totalAmount, dueDate, issueDate, description, viewUrl, lineSummary } = data;
      const emailSubject = `Invoice ${invoiceNumber} from ${businessName}`;

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
   * Send booking confirmation to customer
   */
  async sendBookingConfirmation(data: {
    to: string;
    customerName: string;
    businessName: string;
    service: string | null;
    scheduledDate: string | null;
    scheduledTime: string | null;
    address: string | null;
    totalPrice: number;
    bookingRef: string;
  }): Promise<boolean> {
    try {
      const { to, customerName, businessName, service, scheduledDate, scheduledTime, address, totalPrice, bookingRef } = data;
      const dateStr = scheduledDate ? new Date(scheduledDate + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }) : 'TBD';
      const timeStr = scheduledTime ? (String(scheduledTime).includes(':') ? String(scheduledTime).slice(0, 5) : String(scheduledTime)) : '';

      const emailSubject = `Booking Confirmed - ${businessName}`;
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
              <p>Your booking with ${businessName} has been confirmed.</p>
              <div class="detail">
                <p><strong>Service:</strong> ${service || 'Service'}</p>
                <p><strong>Date:</strong> ${dateStr}</p>
                ${timeStr ? `<p><strong>Time:</strong> ${timeStr}</p>` : ''}
                ${address ? `<p><strong>Address:</strong> ${address}</p>` : ''}
                <p><strong>Amount:</strong> $${Number(totalPrice || 0).toFixed(2)}</p>
              </div>
              <p>If you have any questions, please contact ${businessName}.</p>
              <p>Thank you for your booking!</p>
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
        console.log('[Email] Booking confirmation (Resend not configured):', to, bookingRef);
        return true;
      }
      const { error } = await this.resendClient.emails.send({
        from: process.env.RESEND_FROM_EMAIL || 'noreply@yourdomain.com',
        to: [to],
        subject: emailSubject,
        html: emailHtml,
      });
      if (error) {
        console.error('Booking confirmation email error:', error);
        return false;
      }
      return true;
    } catch (e) {
      console.error('sendBookingConfirmation error:', e);
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
  }): Promise<boolean> {
    try {
      const { to, customerName, businessName, service, amount, bookingRef, paymentMethod = 'card' } = data;
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
              <p>Best regards,<br>The ${businessName} Team</p>
            </div>
            <div class="footer">
              <p>This is an automated receipt. Please do not reply to this email.</p>
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

      const emailSubject = `New booking assigned to you – ${businessName}`;
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
