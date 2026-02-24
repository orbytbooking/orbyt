import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

/**
 * GET: Provider config (clock_in_out_enabled, etc.) for the provider's business
 * Auth: Bearer token from provider session.
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
      .select('business_id')
      .eq('user_id', user.id)
      .single();

    if (!provider) {
      return NextResponse.json({ error: 'Provider not found' }, { status: 404 });
    }

    const { data: optsRow, error: optsError } = await supabaseAdmin
      .from('business_store_options')
      .select('*')
      .eq('business_id', provider.business_id)
      .maybeSingle();

    if (optsError) {
      console.error('Provider config store options:', optsError);
      return NextResponse.json({ error: 'Could not load settings' }, { status: 500 });
    }

    const opts = optsRow as Record<string, unknown> | null;
    return NextResponse.json({
      clock_in_out_enabled: opts == null ? true : (opts.clock_in_out_enabled ?? false),
      providers_can_see_unassigned: opts?.providers_can_see_unassigned ?? true,
      provider_assignment_mode: opts?.provider_assignment_mode ?? 'automatic',
      time_tracking_mode: opts?.time_tracking_mode ?? 'timestamps_only',
      distance_unit: opts?.distance_unit ?? 'miles',
      disable_auto_clock_in: opts?.disable_auto_clock_in ?? false,
      auto_clock_out_enabled: opts?.auto_clock_out_enabled ?? false,
      auto_clock_out_distance_meters: opts?.auto_clock_out_distance_meters ?? 500,
      completion_on_clock_out: opts?.completion_on_clock_out ?? false,
      allow_reclock_in: opts?.allow_reclock_in ?? false,
      time_log_updates_booking: opts?.time_log_updates_booking ?? false,
    });
  } catch (e) {
    console.error('Provider config GET:', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
