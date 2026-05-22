import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { normalizeTaxSettings, toPublicBookingTaxSettings } from '@/lib/bookingTax';

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/** Tax settings safe for anonymous book-now (percentages + label only; no Taxify secrets). */
export async function GET(request: NextRequest) {
  const businessId = request.nextUrl.searchParams.get('business_id')?.trim() || '';
  if (!businessId || !UUID_RE.test(businessId)) {
    return NextResponse.json({ error: 'Valid business_id query parameter required' }, { status: 400 });
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
  }

  try {
    const supabase = createClient(url, key, { auth: { persistSession: false } });
    const { data, error } = await supabase
      .from('business_tax_settings')
      .select('settings')
      .eq('business_id', businessId)
      .maybeSingle();

    if (error) {
      console.error('public/booking-tax-settings GET:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const settings = toPublicBookingTaxSettings(normalizeTaxSettings(data?.settings));
    return NextResponse.json({ settings });
  } catch (e) {
    console.error('public/booking-tax-settings GET:', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
