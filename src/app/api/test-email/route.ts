import { NextResponse } from 'next/server';
import { Resend } from 'resend';

export async function GET() {
  try {
    const resendApiKey = process.env.RESEND_API_KEY;
    const fromEmail = process.env.RESEND_FROM_EMAIL;
    
    console.log('=== EMAIL CONFIGURATION TEST ===');
    console.log('Resend API Key exists:', !!resendApiKey);
    console.log('API Key length:', resendApiKey?.length || 0);
    console.log('From Email:', fromEmail);
    
    if (!resendApiKey) {
      return NextResponse.json({ 
        error: 'RESEND_API_KEY is missing',
        config: {
          hasApiKey: false,
          hasFromEmail: !!fromEmail,
          fromEmail: fromEmail || 'missing'
        }
      }, { status: 400 });
    }
    
    if (!fromEmail) {
      return NextResponse.json({ 
        error: 'RESEND_FROM_EMAIL is missing',
        config: {
          hasApiKey: !!resendApiKey,
          apiKeyLength: resendApiKey.length,
          hasFromEmail: false
        }
      }, { status: 400 });
    }

    // Test Resend connection
    const resend = new Resend(resendApiKey);
    
    try {
      // Test with a simple API call to verify the key works
      const result = await resend.emails.send({
        from: fromEmail,
        to: ['test@example.com'], // This will fail but tells us if the API key is valid
        subject: 'Test Email',
        html: '<p>This is a test</p>'
      });
      
      return NextResponse.json({ 
        success: true,
        message: 'Resend API key is valid and domain is verified',
        config: {
          hasApiKey: true,
          hasFromEmail: true,
          fromEmail: fromEmail,
          testResult: result
        }
      });
      
    } catch (resendError: any) {
      console.error('Resend error:', resendError);
      
      let errorType = 'unknown';
      if (resendError.message.includes('invalid_api_key')) {
        errorType = 'invalid_api_key';
      } else if (resendError.message.includes('domain_not_verified')) {
        errorType = 'domain_not_verified';
      } else if (resendError.message.includes('from_address_invalid')) {
        errorType = 'from_address_invalid';
      }
      
      return NextResponse.json({ 
        error: 'Resend configuration test failed',
        resendError: resendError.message,
        errorType: errorType,
        config: {
          hasApiKey: true,
          hasFromEmail: true,
          fromEmail: fromEmail
        }
      }, { status: 400 });
    }
    
  } catch (error: any) {
    console.error('Test error:', error);
    return NextResponse.json({ 
      error: 'Test failed',
      message: error.message 
    }, { status: 500 });
  }
}
