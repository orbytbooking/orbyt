import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

/**
 * POST: Toggle provider payout pause state
 * Body: { paused?: boolean }
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: providerId } = await params;
    const businessId = request.headers.get('x-business-id');
    if (!businessId || !providerId) {
      return NextResponse.json({ error: 'Business ID and provider ID required' }, { status: 400 });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const body = await request.json().catch(() => ({}));
    const paused = Boolean(body?.paused);

    const { data: provider, error } = await supabase
      .from('service_providers')
      .update({ payout_paused: paused, updated_at: new Date().toISOString() })
      .eq('id', providerId)
      .eq('business_id', businessId)
      .select('id')
      .single();

    if (error || !provider) {
      return NextResponse.json({ error: error?.message || 'Provider not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      paused,
      message: paused ? 'Provider payouts paused.' : 'Provider payouts resumed.',
    });
  } catch (e) {
    console.error('Provider payout pause POST:', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
