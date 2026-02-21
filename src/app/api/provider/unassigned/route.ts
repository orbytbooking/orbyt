import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseProviderClient } from '@/lib/supabaseProviderClient';

/**
 * GET: List unassigned bookings for the provider's business
 * Providers can grab these jobs (when allowed by store options)
 */
export async function GET(request: NextRequest) {
  try {
    const supabaseProvider = getSupabaseProviderClient();
    const { data: { session }, error: authError } = await supabaseProvider.auth.getSession();

    if (authError || !session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } }
    );

    const { data: provider } = await supabaseAdmin
      .from('service_providers')
      .select('id, business_id')
      .eq('user_id', session.user.id)
      .single();

    if (!provider) {
      return NextResponse.json({ error: 'Provider not found' }, { status: 404 });
    }

    // Check store options - can provider see unassigned?
    const { data: opts } = await supabaseAdmin
      .from('business_store_options')
      .select('providers_can_see_unassigned, providers_can_see_all_unassigned')
      .eq('business_id', provider.business_id)
      .maybeSingle();

    if (!opts?.providers_can_see_unassigned) {
      return NextResponse.json({ error: 'Providers cannot see unassigned jobs', bookings: [] }, { status: 200 });
    }

    const today = new Date().toISOString().split('T')[0];
    const { data: bookings } = await supabaseAdmin
      .from('bookings')
      .select(`
        id, service, scheduled_date, scheduled_time, address, apt_no, zip_code,
        total_price, customer_name, customer_phone, notes, status, unassigned_priority
      `)
      .eq('business_id', provider.business_id)
      .is('provider_id', null)
      .in('status', ['pending', 'confirmed'])
      .gte('scheduled_date', today)
      .order('scheduled_date', { ascending: true })
      .order('scheduled_time', { ascending: true });

    return NextResponse.json({
      bookings: bookings ?? [],
      canGrab: true,
    });
  } catch (e) {
    console.error('Provider unassigned GET:', e);
    return NextResponse.json({ error: 'Internal server error', bookings: [] }, { status: 500 });
  }
}
