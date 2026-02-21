import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseProviderClient } from '@/lib/supabaseProviderClient';

/**
 * GET: Provider config (clock_in_out_enabled, etc.) for the provider's business
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
      .select('business_id')
      .eq('user_id', session.user.id)
      .single();

    if (!provider) {
      return NextResponse.json({ error: 'Provider not found' }, { status: 404 });
    }

    const { data: opts } = await supabaseAdmin
      .from('business_store_options')
      .select('clock_in_out_enabled')
      .eq('business_id', provider.business_id)
      .maybeSingle();

    return NextResponse.json({
      clock_in_out_enabled: opts?.clock_in_out_enabled ?? false,
    });
  } catch (e) {
    console.error('Provider config GET:', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
