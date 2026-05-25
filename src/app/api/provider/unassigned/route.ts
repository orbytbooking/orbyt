import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

/**
 * GET: List unassigned bookings for the provider's business
 * Providers can grab these jobs (when allowed by store options)
 * Auth: Bearer token from provider session (same as /api/provider/bookings).
 */
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } }
    );

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: provider } = await supabaseAdmin
      .from('service_providers')
      .select('id, business_id')
      .eq('user_id', user.id)
      .single();

    if (!provider) {
      return NextResponse.json({ error: 'Provider not found' }, { status: 404 });
    }

    // Check store options - can provider see unassigned? (default true when no row)
    const { data: opts } = await supabaseAdmin
      .from('business_store_options')
      .select('providers_can_see_unassigned, providers_can_see_all_unassigned')
      .eq('business_id', provider.business_id)
      .maybeSingle();

    if (opts && opts.providers_can_see_unassigned === false) {
      return NextResponse.json({ error: 'Providers cannot see unassigned jobs', bookings: [], canGrab: false }, { status: 200 });
    }

    const today = new Date().toISOString().split('T')[0];
    const { data: rawBookings } = await supabaseAdmin
      .from('bookings')
      .select(`
        id, service, scheduled_date, scheduled_time, date, time, address, apt_no, zip_code,
        total_price, customer_name, customer_phone, notes, status, unassigned_priority
      `)
      .eq('business_id', provider.business_id)
      .is('provider_id', null)
      .in('status', ['pending', 'confirmed']);

    const bookings = (rawBookings ?? [])
      .filter((b: { scheduled_date?: string; date?: string }) => {
        const effectiveDate = b.scheduled_date || b.date || '';
        return effectiveDate >= today;
      })
      .sort((a: any, b: any) => {
        const dateA = a.scheduled_date || a.date || '';
        const dateB = b.scheduled_date || b.date || '';
        if (dateA !== dateB) return dateA.localeCompare(dateB);
        const timeA = a.scheduled_time || a.time || '';
        const timeB = b.scheduled_time || b.time || '';
        return (timeA || '').localeCompare(timeB || '');
      });

    return NextResponse.json({
      bookings,
      canGrab: true,
    });
  } catch (e) {
    console.error('Provider unassigned GET:', e);
    return NextResponse.json({ error: 'Internal server error', bookings: [] }, { status: 500 });
  }
}
