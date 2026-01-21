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

    if (error) {
      console.error('Invitation validation error:', error);
      return NextResponse.json(
        { error: 'Invalid invitation' },
        { status: 404 }
      );
    }

    if (!invitation) {
      return NextResponse.json(
        { error: 'Invitation not found' },
        { status: 404 }
      );
    }

    // Check if invitation has expired
    const expiresAt = new Date(invitation.expires_at);
    const now = new Date();
    
    if (expiresAt < now) {
      return NextResponse.json(
        { error: 'Invitation has expired' },
        { status: 410 }
      );
    }

    return NextResponse.json({ 
      valid: true, 
      invitation 
    });

  } catch (error) {
    console.error('Server error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
