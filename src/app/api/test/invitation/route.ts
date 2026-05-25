import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, businessId } = body;

    // Create a test invitation
    const invitationToken = uuidv4();
    const tempPassword = Math.random().toString(36).slice(-8) + Math.random().toString(36).slice(-8);

    const { data: invitationData, error } = await supabase
      .from('provider_invitations')
      .insert({
        business_id: businessId,
        email,
        first_name: 'Test',
        last_name: 'Provider',
        phone: '(555) 123-4567',
        address: '123 Test St',
        provider_type: 'individual',
        invitation_token: invitationToken,
        temp_password: tempPassword,
        status: 'pending',
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      invitation: invitationData,
      testUrl: `http://localhost:3000/provider/invite?token=${invitationToken}&email=${encodeURIComponent(email)}`
    });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
