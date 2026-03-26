import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

const DEFAULT_BLOCKED_MESSAGE = '<p>Please contact admin to cancel your booking.</p>';

/**
 * GET ?businessId=xxx
 * Returns whether customers may cancel online and the HTML message when they may not.
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
      console.error('Customer cancellation settings fetch error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const settings = (data?.settings as Record<string, unknown>) || {};
    const allow_customer_self_cancel = settings.allowCustomerSelfCancel === 'no' ? false : true;
    const rawMsg = settings.customerSelfCancelBlockedMessage;
    const customer_self_cancel_blocked_message =
      typeof rawMsg === 'string' && rawMsg.trim() !== '' ? rawMsg : DEFAULT_BLOCKED_MESSAGE;

    return NextResponse.json({
      allow_customer_self_cancel,
      customer_self_cancel_blocked_message,
    });
  } catch (e) {
    console.error('Customer cancellation settings GET:', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
