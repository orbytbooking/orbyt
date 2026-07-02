import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { DEFAULT_ACCEPTED_PAYMENT_FORMS, parseAcceptedPaymentForms } from '@/lib/acceptedPaymentMethods';

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/** Safe subset of store options for anonymous book-now (service role, UUID only). */
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
      .from('business_store_options')
      .select(
        [
          'scheduling_type',
          'specific_provider_for_customers',
          'show_provider_score_to_customers',
          'show_provider_completed_jobs_to_customers',
          'show_provider_availability_to_customers',
          'location_management',
          'wildcard_zip_enabled',
          'accepted_payment_credit_card',
          'accepted_payment_cash_check',
        ].join(', '),
      )
      .eq('business_id', businessId)
      .maybeSingle();

    if (error) {
      console.error('public/booking-store-options GET:', error);
      const message = String(error.message ?? '').toLowerCase();
      if (error.code === '42703' || message.includes('accepted_payment_')) {
        const fallback = await supabase
          .from('business_store_options')
          .select(
            [
              'scheduling_type',
              'specific_provider_for_customers',
              'show_provider_score_to_customers',
              'show_provider_completed_jobs_to_customers',
              'show_provider_availability_to_customers',
              'location_management',
              'wildcard_zip_enabled',
            ].join(', '),
          )
          .eq('business_id', businessId)
          .maybeSingle();
        const row = fallback.data as Record<string, unknown> | null;
        const accepted = DEFAULT_ACCEPTED_PAYMENT_FORMS;
        return NextResponse.json({
          options: {
            scheduling_type:
              row?.scheduling_type === 'accept_or_decline' ||
              row?.scheduling_type === 'accepts_same_day_only' ||
              row?.scheduling_type === 'accepted_automatically'
                ? row.scheduling_type
                : 'accepted_automatically',
            specific_provider_for_customers: row?.specific_provider_for_customers !== false,
            show_provider_score_to_customers: row?.show_provider_score_to_customers !== false,
            show_provider_completed_jobs_to_customers:
              row?.show_provider_completed_jobs_to_customers !== false,
            show_provider_availability_to_customers: row?.show_provider_availability_to_customers !== false,
            location_management:
              row?.location_management === 'name' ||
              row?.location_management === 'none' ||
              row?.location_management === 'zip'
                ? row.location_management
                : 'zip',
            wildcard_zip_enabled: row?.wildcard_zip_enabled !== false,
            accepted_payment_credit_card: accepted.creditCard,
            accepted_payment_cash_check: accepted.cashCheck,
          },
        });
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const row = data as Record<string, unknown> | null;
    const accepted = parseAcceptedPaymentForms(
      row as { accepted_payment_credit_card?: boolean; accepted_payment_cash_check?: boolean } | null,
    );

    return NextResponse.json({
      options: {
        scheduling_type:
          row?.scheduling_type === 'accept_or_decline' ||
          row?.scheduling_type === 'accepts_same_day_only' ||
          row?.scheduling_type === 'accepted_automatically'
            ? row.scheduling_type
            : 'accepted_automatically',
        specific_provider_for_customers: row?.specific_provider_for_customers !== false,
        show_provider_score_to_customers: row?.show_provider_score_to_customers !== false,
        show_provider_completed_jobs_to_customers: row?.show_provider_completed_jobs_to_customers !== false,
        show_provider_availability_to_customers: row?.show_provider_availability_to_customers !== false,
        location_management:
          row?.location_management === 'name' || row?.location_management === 'none' || row?.location_management === 'zip'
            ? row.location_management
            : 'zip',
        wildcard_zip_enabled: row?.wildcard_zip_enabled !== false,
        accepted_payment_credit_card: accepted.creditCard,
        accepted_payment_cash_check: accepted.cashCheck,
      },
    });
  } catch (e) {
    console.error('public/booking-store-options GET:', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
