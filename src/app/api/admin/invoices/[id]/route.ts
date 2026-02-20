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

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) return createUnauthorizedResponse();
    if (user.user_metadata?.role === 'customer') return createForbiddenResponse('Access denied');

    const { id } = await params;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const businessId = await getBusinessId(supabase);
    if (!businessId) return NextResponse.json({ error: 'Business not found' }, { status: 404 });

    const { data: invoice, error } = await supabase
      .from('invoices')
      .select(`
        *,
        invoice_bookings(booking_id, amount, sort_order, bookings(id, service, scheduled_date, scheduled_time, total_price, date, time, customer_name, address)),
        invoice_line_items(*)
      `)
      .eq('id', id)
      .eq('business_id', businessId)
      .single();

    if (error || !invoice) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }

    return NextResponse.json({ invoice });
  } catch (e) {
    console.error('Invoice get error:', e);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) return createUnauthorizedResponse();
    if (user.user_metadata?.role === 'customer') return createForbiddenResponse('Access denied');

    const { id } = await params;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const businessId = await getBusinessId(supabase);
    if (!businessId) return NextResponse.json({ error: 'Business not found' }, { status: 404 });

    const { data: existing } = await supabase
      .from('invoices')
      .select('id')
      .eq('id', id)
      .eq('business_id', businessId)
      .single();

    if (!existing) return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });

    const body = await request.json();
    const update: Record<string, unknown> = {};
    const allowed = [
      'status', 'payment_status', 'issue_date', 'due_date', 'total_amount', 'amount_paid',
      'description', 'notes', 'billing_address'
    ];
    for (const k of allowed) {
      if (body[k] !== undefined) update[k] = body[k];
    }
    update.updated_at = new Date().toISOString();

    const { data: invoice, error } = await supabase
      .from('invoices')
      .update(update)
      .eq('id', id)
      .eq('business_id', businessId)
      .select(`
        *,
        invoice_bookings(booking_id, amount, sort_order, bookings(id, service, scheduled_date, scheduled_time, total_price, date, time)),
        invoice_line_items(*)
      `)
      .single();

    if (error) {
      console.error('Invoice update error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ invoice });
  } catch (e) {
    console.error('Invoice update error:', e);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) return createUnauthorizedResponse();
    if (user.user_metadata?.role === 'customer') return createForbiddenResponse('Access denied');

    const { id } = await params;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const businessId = await getBusinessId(supabase);
    if (!businessId) return NextResponse.json({ error: 'Business not found' }, { status: 404 });

    const { error } = await supabase
      .from('invoices')
      .delete()
      .eq('id', id)
      .eq('business_id', businessId);

    if (error) {
      console.error('Invoice delete error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error('Invoice delete error:', e);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
