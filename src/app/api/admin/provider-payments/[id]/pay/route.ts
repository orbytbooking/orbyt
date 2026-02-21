import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

/**
 * POST: Mark all pending earnings for a provider as paid
 * Body: { payoutDate?: string } (optional, default today)
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

    const { data: provider } = await supabase
      .from('service_providers')
      .select('id')
      .eq('id', providerId)
      .eq('business_id', businessId)
      .single();

    if (!provider) {
      return NextResponse.json({ error: 'Provider not found' }, { status: 404 });
    }

    const body = await request.json().catch(() => ({}));
    const payoutDate = body.payoutDate || new Date().toISOString().split('T')[0];

    const { data: updated, error } = await supabase
      .from('provider_earnings')
      .update({ status: 'paid', payout_date: payoutDate, updated_at: new Date().toISOString() })
      .eq('provider_id', providerId)
      .eq('status', 'pending')
      .select();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const totalPaid = (updated ?? []).reduce((s: number, r: any) => s + Number(r.net_amount || 0), 0);

    return NextResponse.json({
      success: true,
      count: updated?.length ?? 0,
      totalPaid,
      message: `Marked ${updated?.length ?? 0} earnings as paid ($${totalPaid.toFixed(2)})`,
    });
  } catch (e) {
    console.error('Provider pay POST:', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
