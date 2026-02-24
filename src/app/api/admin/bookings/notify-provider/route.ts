import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getAuthenticatedUser, createUnauthorizedResponse, createForbiddenResponse } from '@/lib/auth-helpers';
import { notifyProviderOfBooking } from '@/lib/notifyProviderBooking';

/**
 * POST: Send "booking assigned" email to the provider assigned to a booking.
 * Body: { bookingId: string }
 * Used after admin manually assigns a provider so the provider gets an email.
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) return createUnauthorizedResponse();
    const role = user.user_metadata?.role || 'owner';
    if (role === 'customer') return createForbiddenResponse('Customers cannot access admin endpoints');

    const body = await request.json().catch(() => ({}));
    const bookingId = body?.bookingId ?? request.nextUrl.searchParams.get('bookingId');
    if (!bookingId) {
      return NextResponse.json({ error: 'bookingId required' }, { status: 400 });
    }

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } }
    );

    const { data: business } = await supabaseAdmin
      .from('businesses')
      .select('id')
      .eq('owner_id', user.id)
      .single();
    if (!business) {
      return NextResponse.json({ error: 'Business not found' }, { status: 404 });
    }

    const { data: booking } = await supabaseAdmin
      .from('bookings')
      .select('id, business_id')
      .eq('id', bookingId)
      .single();
    if (!booking || booking.business_id !== business.id) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    }

    const result = await notifyProviderOfBooking(supabaseAdmin, { bookingId });
    return NextResponse.json({
      success: result.sent,
      ...(result.reason && { reason: result.reason }),
    });
  } catch (e) {
    console.error('Notify provider email error:', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
