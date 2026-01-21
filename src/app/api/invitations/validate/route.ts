import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

// Temporarily hardcode service role key to bypass environment variable issue
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://aezwtsnvttquqkzjhoak.supabase.co';
const supabaseServiceKey = process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFlend0c252dHRxdXFrempob2FrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzYxNzcwMiwiZXhwIjoyMDgzMTkzNzAyfQ.MW8hx4BcMKDG3-fxNcIrmcbdu2xIfYjIxIunqPmN3D0';

console.log('=== VALIDATE API ENVIRONMENT DEBUG ===');
console.log('Supabase URL:', supabaseUrl);
console.log('Service key length:', supabaseServiceKey.length);
console.log('Service key starts with eyJ:', supabaseServiceKey.startsWith('eyJ'));

const supabase = createClient(supabaseUrl, supabaseServiceKey);

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');
    const email = searchParams.get('email');

    console.log('=== INVITATION VALIDATION DEBUG ===');
    console.log('Request URL:', request.url);
    console.log('Token:', token);
    console.log('Email:', email);
    console.log('Headers:', Object.fromEntries(request.headers));
    console.log('Environment check:');
    console.log('- NEXT_PUBLIC_SUPABASE_URL:', process.env.NEXT_PUBLIC_SUPABASE_URL ? 'SET' : 'NOT SET');
    console.log('- NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY:', process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY ? 'SET' : 'NOT SET');
    console.log('- NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY length:', process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY?.length || 0);
    console.log('- NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY starts with eyJ:', process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY?.startsWith('eyJ'));
    console.log('- NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY available:', !!process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY);
    console.log('- supabase available:', !!supabase);
    console.log('Starting database query...');

    if (!token || !email) {
      return NextResponse.json(
        { error: 'Token and email are required' },
        { status: 400 }
      );
    }

    // Use service role to bypass RLS and validate invitation
    const { data: invitation, error } = await supabase
      .from('provider_invitations')
      .select('*')
      .eq('invitation_token', token)
      .eq('email', email)
      .eq('status', 'pending')
      .single();

    console.log('Database query result:');
    console.log('- Error:', error);
    console.log('- Invitation data:', invitation);
    console.log('- Invitation found:', !!invitation);
    console.log('- Invitation ID:', invitation?.id);
    console.log('- Invitation email:', invitation?.email);
    console.log('- Invitation expires at:', invitation?.expires_at);

    if (error) {
      console.error('Invitation validation error:', error);
      return NextResponse.json(
        { error: 'Invalid invitation', details: error },
        { status: 404 }
      );
    }

    if (!invitation) {
      console.error('No invitation found');
      return NextResponse.json(
        { error: 'Invitation not found' },
        { status: 404 }
      );
    }

    // Check if invitation has expired
    const expiresAt = new Date(invitation.expires_at);
    const now = new Date();
    
    console.log('Expiration check:');
    console.log('- Expires at:', expiresAt);
    console.log('- Current time:', now);
    console.log('- Is expired:', expiresAt < now);
    
    if (expiresAt < now) {
      return NextResponse.json(
        { error: 'Invitation has expired' },
        { status: 410 }
      );
    }

    // Get business data using service role to bypass RLS
    const { data: businessData, error: businessError } = await supabase
      .from('businesses')
      .select('name')
      .eq('id', invitation.business_id)
      .single();

    if (businessError) {
      console.error('Business fetch error:', businessError);
      return NextResponse.json(
        { error: 'Business not found', details: businessError },
        { status: 404 }
      );
    }

    return NextResponse.json({ 
      valid: true, 
      invitation: {
        ...invitation,
        business: {
          name: businessData.name
        }
      }
    });

  } catch (error) {
    console.error('Server error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error },
      { status: 500 }
    );
  }
}
