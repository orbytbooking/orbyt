import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

const DEFAULT_RESCHEDULE_MESSAGE =
  'Please get in touch with the admin to reschedule your booking. You can only change your customer details and credit card.';

/**
 * GET ?businessId=xxx
 * Returns reschedule settings for the customer portal: whether self-reschedule is allowed and the message to show when it is not.
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
      .from('business_store_options')
      .select('allow_customer_self_reschedule, reschedule_message')
      .eq('business_id', businessId)
      .maybeSingle();

    if (error) {
      console.error('Reschedule settings fetch error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const allow_customer_self_reschedule = data?.allow_customer_self_reschedule ?? false;
    const reschedule_message =
      data?.reschedule_message != null && String(data.reschedule_message).trim() !== ''
        ? String(data.reschedule_message)
        : DEFAULT_RESCHEDULE_MESSAGE;

    return NextResponse.json({
      allow_customer_self_reschedule,
      reschedule_message,
    });
  } catch (e) {
    console.error('Reschedule settings GET:', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
