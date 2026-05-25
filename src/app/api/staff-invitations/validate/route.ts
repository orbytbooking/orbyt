import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

function serviceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Missing Supabase config');
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');
    const email = searchParams.get('email');

    if (!token || !email) {
      return NextResponse.json({ error: 'Token and email are required' }, { status: 400 });
    }

    const supabase = serviceClient();

    const { data: invitation, error } = await supabase
      .from('staff_invitations')
      .select('id, business_id, staff_id, email, status, expires_at, invitation_token')
      .eq('invitation_token', token)
      .eq('email', email.trim().toLowerCase())
      .eq('status', 'pending')
      .maybeSingle();

    if (error || !invitation) {
      return NextResponse.json({ error: 'Invalid invitation' }, { status: 404 });
    }

    if (new Date(invitation.expires_at) < new Date()) {
      return NextResponse.json({ error: 'Invitation has expired' }, { status: 410 });
    }

    const { data: staff, error: staffErr } = await supabase
      .from('staff')
      .select('id, first_name, last_name, email, role, phone, user_id')
      .eq('id', invitation.staff_id)
      .single();

    if (staffErr || !staff) {
      return NextResponse.json({ error: 'Staff record not found' }, { status: 404 });
    }

    if (staff.user_id) {
      return NextResponse.json({ error: 'This invitation was already accepted' }, { status: 409 });
    }

    const { data: business } = await supabase
      .from('businesses')
      .select('name')
      .eq('id', invitation.business_id)
      .single();

    return NextResponse.json({
      valid: true,
      invitation: {
        id: invitation.id,
        business_id: invitation.business_id,
        staff_id: invitation.staff_id,
        email: invitation.email,
        first_name: staff.first_name,
        last_name: staff.last_name,
        role: staff.role,
        phone: staff.phone,
        business: { name: business?.name ?? 'Your team' },
      },
    });
  } catch (e) {
    console.error('staff-invitations validate:', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
