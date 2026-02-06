import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email } = body;
    
    console.log('=== CAMPAIGN EMAIL TEST ===');
    console.log('Target email:', email);
    console.log('RESEND_API_KEY exists:', !!process.env.RESEND_API_KEY);
    console.log('RESEND_FROM_EMAIL:', process.env.RESEND_FROM_EMAIL);
    
    const resendApiKey = process.env.RESEND_API_KEY;
    const fromEmail = process.env.RESEND_FROM_EMAIL;
    
    if (!resendApiKey) {
      return NextResponse.json({ error: 'RESEND_API_KEY is missing' }, { status: 500 });
    }
    
    if (!fromEmail) {
      return NextResponse.json({ error: 'RESEND_FROM_EMAIL is missing' }, { status: 500 });
    }
    
    const resend = new Resend(resendApiKey);
    
    const emailData = {
      from: fromEmail,
      to: [email],
      subject: 'Test Campaign Email from Orbyt',
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px;">
          <h2>📧 Test Campaign Email</h2>
          <p>This is a test email to verify campaign emails are working.</p>
          <p>If you receive this, campaign emails should work correctly.</p>
          <br>
          <p>From: ${fromEmail}</p>
          <p>Sent at: ${new Date().toLocaleString()}</p>
        </div>
      `,
    };
    
    console.log('Sending campaign test email:', {
      from: emailData.from,
      to: emailData.to,
      subject: emailData.subject
    });
    
    const result = await resend.emails.send(emailData);
    
    console.log('✅ Campaign test email sent:', result);
    
    return NextResponse.json({ 
      success: true,
      message: 'Campaign test email sent successfully',
      result: result
    });
    
  } catch (error: any) {
    console.error('❌ Campaign test email failed:', error);
    
    return NextResponse.json({ 
      error: 'Campaign test email failed',
      message: error.message,
      details: error
    }, { status: 500 });
  }
}
