// Test script to verify Resend configuration
import { Resend } from 'resend';

// Use your actual API key
const RESEND_API_KEY = 're_MMzU8AP5_36ecKHduvWqazLgxyVErcJvX';
const RESEND_FROM_EMAIL = 'onboarding@resend.dev'; // Updated to use Resend's verified domain

const resend = new Resend(RESEND_API_KEY);

async function testEmail() {
  console.log('Testing Resend configuration...');
  console.log('API Key:', RESEND_API_KEY);
  console.log('From Email:', RESEND_FROM_EMAIL);
  
  try {
    console.log('📧 Sending test email...');
    
    const result = await resend.emails.send({
      from: RESEND_FROM_EMAIL,
      to: ['ajofracio@gmail.com'], // Using your email for testing
      subject: 'Test Email from Orbyt - FIXED',
      html: '<p>This is a test email to verify Resend is working with the verified domain.</p>',
    });

    console.log('✅ Email sent successfully:', result);
    if (result.data) {
      console.log('Email ID:', result.data.id);
    }
  } catch (error) {
    console.error('❌ Error sending email:', error);
    
    if (error.message.includes('invalid_api_key')) {
      console.error('💡 Your Resend API key is invalid');
    } else if (error.message.includes('domain_not_verified')) {
      console.error('💡 Your sending domain is not verified in Resend');
    } else if (error.message.includes('from_address_invalid')) {
      console.error('💡 Your from email address is invalid or not verified');
    } else {
      console.error('💡 Full error details:', JSON.stringify(error, null, 2));
    }
  }
}

testEmail();
