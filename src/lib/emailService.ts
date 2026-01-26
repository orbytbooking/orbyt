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
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://www.orbytservice.com';
      const invitationUrl = `${baseUrl}/provider/invite?token=${invitationToken}&email=${encodeURIComponent(email)}`;
      
      console.log('Generated invitation URL:', invitationUrl);
      
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
                <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://www.orbytservice.com'}/provider/login" class="button">
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
}
