import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

/**
 * GET ?businessId=xxx
 * Returns the business cancellation policy for display to customers (disclaimer / fee from settings).
 */
export async function GET(request: NextRequest) {
  try {
    const businessId = request.nextUrl.searchParams.get('businessId');
    if (!businessId) {
      return NextResponse.json({ error: 'Business ID required' }, { status: 400 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    const { data, error } = await supabase
      .from('business_cancellation_settings')
      .select('settings')
      .eq('business_id', businessId)
      .maybeSingle();

    if (error) {
      console.error('Cancellation policy fetch error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const settings = (data?.settings as Record<string, unknown>) || {};
    const chargeFee = settings.chargeFee === 'yes';
    const feeAmount = settings.feeAmount != null ? String(settings.feeAmount) : '';
    const feeCurrency = (settings.feeCurrency as string) || '$';

    const amountNum = parseFloat(feeAmount);
    const feeLabel =
      chargeFee && !Number.isNaN(amountNum) && amountNum >= 0
        ? `${feeCurrency}${amountNum.toFixed(2)}`
        : null;

    const disclaimerText = chargeFee && feeLabel
      ? `Based on our cancellation policy, a fee of ${feeLabel} may apply when you cancel within the policy window.`
      : 'Based on our cancellation policy, no cancellation fee applies.';

    return NextResponse.json({
      chargeFee,
      feeAmount: feeLabel ? amountNum : null,
      feeCurrency: feeLabel ? feeCurrency : null,
      feeLabel,
      disclaimerText,
    });
  } catch (e) {
    console.error('Cancellation policy GET:', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
