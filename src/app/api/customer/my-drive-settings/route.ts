import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

/**
 * GET ?business=uuid
 * Public (no auth): whether My Drive is enabled for this business — used for customer portal nav.
 */
export async function GET(request: NextRequest) {
  try {
    const businessId = request.nextUrl.searchParams.get('business');
    if (!businessId) {
      return NextResponse.json({ error: 'Business ID required' }, { status: 400 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }

    const supabase = createClient(supabaseUrl, supabaseKey, { auth: { persistSession: false } });
    const { data, error } = await supabase
      .from('business_store_options')
      .select('customer_my_drive_enabled')
      .eq('business_id', businessId)
      .maybeSingle();

    if (error) {
      console.error('My drive settings fetch error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      customer_my_drive_enabled: data?.customer_my_drive_enabled === true,
    });
  } catch (e) {
    console.error('My drive settings GET:', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
