import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

/**
 * GET: List providers with pending earnings
 */
export async function GET(request: NextRequest) {
  try {
    const businessId = request.headers.get('x-business-id') || request.nextUrl.searchParams.get('businessId');
    if (!businessId) {
      return NextResponse.json({ error: 'Business ID required' }, { status: 400 });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data: providers } = await supabase
      .from('service_providers')
      .select('id, first_name, last_name, email')
      .eq('business_id', businessId)
      .eq('status', 'active');

    const result: Array<{
      id: string;
      name: string;
      email: string;
      pendingAmount: number;
      pendingCount: number;
      paidAmount: number;
      paidCount: number;
    }> = [];

    for (const p of providers ?? []) {
      const { data: pending } = await supabase
        .from('provider_earnings')
        .select('id, net_amount')
        .eq('provider_id', p.id)
        .eq('status', 'pending');

      const { data: paid } = await supabase
        .from('provider_earnings')
        .select('id, net_amount')
        .eq('provider_id', p.id)
        .eq('status', 'paid');

      const pendingAmount = (pending ?? []).reduce((s, r) => s + Number(r.net_amount || 0), 0);
      const paidAmount = (paid ?? []).reduce((s, r) => s + Number(r.net_amount || 0), 0);

      result.push({
        id: p.id,
        name: `${p.first_name || ''} ${p.last_name || ''}`.trim() || 'Provider',
        email: p.email || '',
        pendingAmount,
        pendingCount: pending?.length ?? 0,
        paidAmount,
        paidCount: paid?.length ?? 0,
      });
    }

    return NextResponse.json({ providers: result });
  } catch (e) {
    console.error('Provider payments GET:', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
