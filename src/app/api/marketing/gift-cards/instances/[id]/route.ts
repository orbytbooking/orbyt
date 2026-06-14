import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { gateMarketingTenantApi } from '@/lib/marketingTenantGate';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseServiceKey) {
  throw new Error('SUPABASE_SERVICE_ROLE_KEY is not configured');
}

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

/** Cancel a gift card instance (soft delete — keeps transaction history). */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const businessId = new URL(request.url).searchParams.get('business_id');

    if (!businessId) {
      return NextResponse.json({ error: 'Business ID is required' }, { status: 400 });
    }

    const gate = await gateMarketingTenantApi(request, businessId);
    if (gate) return gate;

    const { data: instance, error: fetchError } = await supabaseAdmin
      .from('gift_card_instances')
      .select('id, unique_code, status, current_balance')
      .eq('id', id)
      .eq('business_id', businessId)
      .maybeSingle();

    if (fetchError) {
      return NextResponse.json({ error: fetchError.message }, { status: 500 });
    }

    if (!instance) {
      return NextResponse.json({ error: 'Gift card instance not found' }, { status: 404 });
    }

    if (instance.status === 'cancelled') {
      return NextResponse.json({ success: true, data: instance, message: 'Already cancelled' });
    }

    const { data: updated, error: updateError } = await supabaseAdmin
      .from('gift_card_instances')
      .update({
        status: 'cancelled',
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('business_id', businessId)
      .select('id, unique_code, status, current_balance')
      .single();

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    await supabaseAdmin.from('gift_card_transactions').insert({
      business_id: businessId,
      gift_card_instance_id: id,
      transaction_type: 'adjustment',
      amount: 0,
      balance_before: instance.current_balance,
      balance_after: instance.current_balance,
      description: `Gift card ${instance.unique_code} cancelled by admin`,
    });

    return NextResponse.json({
      success: true,
      data: updated,
      message: 'Gift card cancelled',
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
