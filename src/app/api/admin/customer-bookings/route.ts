import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getAuthenticatedUser, createUnauthorizedResponse, createForbiddenResponse } from '@/lib/auth-helpers';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

async function getBusinessId(supabase: ReturnType<typeof createClient>) {
  const user = await getAuthenticatedUser();
  if (!user) return null;
  if (user.user_metadata?.role === 'customer') return null;
  const { data } = await supabase
    .from('businesses')
    .select('id')
    .eq('owner_id', user.id)
    .single();
  return data?.id ?? null;
}

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) return createUnauthorizedResponse();
    if (user.user_metadata?.role === 'customer') return createForbiddenResponse('Access denied');

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const businessId = await getBusinessId(supabase);
    if (!businessId) return NextResponse.json({ error: 'Business not found' }, { status: 404 });

    const { searchParams } = new URL(request.url);
    const customerId = searchParams.get('customer_id');
    if (!customerId) {
      return NextResponse.json({ error: 'customer_id is required' }, { status: 400 });
    }
    const customerEmail = (searchParams.get('customer_email') || '').trim();
    const escapeIlike = (s: string) => s.replace(/\\/g, '\\\\').replace(/%/g, '\\%').replace(/_/g, '\\_');

    // Fetch by customer_id (primary)
    const { data: byId, error: errId } = await supabase
      .from('bookings')
      .select('id, service, scheduled_date, scheduled_time, date, time, total_price, customer_name, customer_email, customer_phone, address, apt_no, zip_code, notes, status, provider_id, provider_name, payment_method, payment_status, frequency, customization, provider_wage, duration_minutes, cancellation_fee_amount, cancellation_fee_currency')
      .eq('business_id', businessId)
      .eq('customer_id', customerId)
      .order('scheduled_date', { ascending: false })
      .order('scheduled_time', { ascending: false })
      .limit(100);

    if (errId) {
      console.error('Customer bookings error:', errId);
      return NextResponse.json({ error: errId.message }, { status: 500 });
    }

    // Also fetch legacy bookings (customer_id null, customer_email match) for admin-created before linking
    let legacy: typeof byId = [];
    if (customerEmail) {
      const { data: byEmail } = await supabase
        .from('bookings')
        .select('id, service, scheduled_date, scheduled_time, date, time, total_price, customer_name, customer_email, customer_phone, address, apt_no, zip_code, notes, status, provider_id, provider_name, payment_method, payment_status, frequency, customization, provider_wage, duration_minutes, cancellation_fee_amount, cancellation_fee_currency')
        .eq('business_id', businessId)
        .is('customer_id', null)
        .ilike('customer_email', escapeIlike(customerEmail))
        .order('scheduled_date', { ascending: false })
        .order('scheduled_time', { ascending: false })
        .limit(100);
      legacy = byEmail ?? [];
    }

    const seen = new Set((byId ?? []).map((b: { id: string }) => b.id));
    const merged = [...(byId ?? [])];
    for (const b of legacy) {
      if (!seen.has((b as { id: string }).id)) {
        seen.add((b as { id: string }).id);
        merged.push(b);
      }
    }
    merged.sort((a: any, b: any) => {
      const da = a.scheduled_date || a.date || '';
      const db = b.scheduled_date || b.date || '';
      if (da !== db) return db.localeCompare(da);
      return (b.scheduled_time || b.time || '').localeCompare(a.scheduled_time || a.time || '');
    });

    // Resolve provider_name when null: fetch from service_providers for provider_ids (works for portal & non-portal customers)
    const needProviderName = merged.filter((b: any) => b.provider_id && !b.provider_name);
    const providerIds = [...new Set(needProviderName.map((b: any) => b.provider_id))];
    let providerNamesById: Record<string, string> = {};
    if (providerIds.length > 0) {
      const { data: providers } = await supabase
        .from('service_providers')
        .select('id, first_name, last_name')
        .in('id', providerIds);
      if (providers) {
        for (const p of providers) {
          const name = `${(p.first_name || '').trim()} ${(p.last_name || '').trim()}`.trim();
          if (name) providerNamesById[p.id] = name;
        }
      }
    }
    const bookings = merged.slice(0, 100).map((b: any) =>
      b.provider_name ? b : { ...b, provider_name: providerNamesById[b.provider_id] || null }
    );

    return NextResponse.json({ bookings });
  } catch (e) {
    console.error('Customer bookings API error:', e);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
