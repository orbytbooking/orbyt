import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');
    const email = searchParams.get('email');

    console.log('=== INVITATION VALIDATION DEBUG ===');
    console.log('Token:', token);
    console.log('Email:', email);

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
    console.log('Error:', error);
    console.log('Invitation:', invitation);

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
    console.log('Expires at:', expiresAt);
    console.log('Current time:', now);
    console.log('Is expired:', expiresAt < now);
    
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
