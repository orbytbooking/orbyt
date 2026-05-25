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
      .select('id, first_name, last_name')
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
    const paidCount = updated?.length ?? 0;

    // Best-effort audit logging for provider payout history.
    const providerName = `${(provider as any)?.first_name || ''} ${(provider as any)?.last_name || ''}`.trim();
    const { error: logError } = await supabase
      .from('provider_payment_logs')
      .insert({
        business_id: businessId,
        provider_id: providerId,
        earnings_count: paidCount,
        total_amount: totalPaid,
        payout_date: payoutDate,
        payout_method: 'manual',
        payout_status: 'completed',
        notes: paidCount > 0 ? 'Marked as paid from admin provider payments page.' : 'No pending earnings to mark as paid.',
        metadata: {
          providerName,
          source: 'admin_provider_payments_mark_as_paid',
        },
      });
    if (logError) {
      console.error('Provider pay log insert failed:', logError);
    }

    return NextResponse.json({
      success: true,
      count: paidCount,
      totalPaid,
      message: `Marked ${paidCount} earnings as paid ($${totalPaid.toFixed(2)})`,
    });
  } catch (e) {
    console.error('Provider pay POST:', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
