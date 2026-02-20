import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getAuthenticatedUser, createUnauthorizedResponse, createForbiddenResponse } from '@/lib/auth-helpers';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

async function getBusinessId(supabase: ReturnType<typeof createClient>) {
  const user = await getAuthenticatedUser();
  if (!user) return null;
  const role = user.user_metadata?.role || 'owner';
  if (role === 'customer') return null;
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
    const status = searchParams.get('status');

    if (!customerId) {
      return NextResponse.json({ error: 'customer_id is required' }, { status: 400 });
    }

    let query = supabase
      .from('invoices')
      .select(`
        *,
        invoice_bookings(booking_id, amount, sort_order, bookings(id, service, scheduled_date, scheduled_time, total_price, date, time)),
        invoice_line_items(*)
      `)
      .eq('business_id', businessId)
      .eq('customer_id', customerId)
      .order('issue_date', { ascending: false });

    if (status) query = query.eq('status', status);

    const { data: invoices, error } = await query;

    if (error) {
      console.error('Invoices list error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ invoices: invoices ?? [] });
  } catch (e) {
    console.error('Invoices API error:', e);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) return createUnauthorizedResponse();
    if (user.user_metadata?.role === 'customer') return createForbiddenResponse('Access denied');

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const businessId = await getBusinessId(supabase);
    if (!businessId) return NextResponse.json({ error: 'Business not found' }, { status: 404 });

    const body = await request.json();
    const {
      customer_id,
      invoice_type = 'custom',
      issue_date,
      due_date,
      total_amount = 0,
      description,
      notes,
      billing_address,
      booking_ids = [],
      line_items = [],
    } = body;

    if (!customer_id) {
      return NextResponse.json({ error: 'customer_id is required' }, { status: 400 });
    }
    if (!issue_date) {
      return NextResponse.json({ error: 'issue_date is required' }, { status: 400 });
    }

    const { count } = await supabase
      .from('invoices')
      .select('*', { count: 'exact', head: true })
      .eq('business_id', businessId);
    const invoice_number = `INV-${String((count ?? 0) + 1).padStart(4, '0')}`;

    const invoiceInsert = {
      business_id: businessId,
      customer_id,
      invoice_number,
      invoice_type: invoice_type === 'booking' ? 'booking' : 'custom',
      status: body.status ?? 'active',
      payment_status: Number(total_amount) <= 0 ? 'paid' : 'pending',
      issue_date,
      due_date: due_date || null,
      total_amount: Number(total_amount) || 0,
      amount_paid: 0,
      description: description || null,
      notes: notes || null,
      billing_address: billing_address || null,
    };

    const { data: invoice, error: invError } = await supabase
      .from('invoices')
      .insert(invoiceInsert)
      .select()
      .single();

    if (invError) {
      console.error('Invoice create error:', invError);
      return NextResponse.json({ error: invError.message }, { status: 500 });
    }

    if (invoice_type === 'booking' && Array.isArray(booking_ids) && booking_ids.length > 0) {
      const { data: bookings } = await supabase
        .from('bookings')
        .select('id, total_price')
        .in('id', booking_ids)
        .eq('business_id', businessId)
        .eq('customer_id', customer_id);

      const amountMap = new Map((bookings ?? []).map((b: { id: string; total_price: number }) => [b.id, b.total_price]));
      const rows = booking_ids.map((bid: string, i: number) => ({
        invoice_id: invoice.id,
        booking_id: bid,
        amount: amountMap.get(bid) ?? 0,
        sort_order: i,
      }));
      await supabase.from('invoice_bookings').insert(rows);
    }

    if (invoice_type === 'custom' && Array.isArray(line_items) && line_items.length > 0) {
      const rows = line_items.map((li: { description: string; quantity?: number; unit_price?: number }, i: number) => {
        const qty = Number(li.quantity) || 1;
        const price = Number(li.unit_price) || 0;
        return {
          invoice_id: invoice.id,
          description: li.description || 'Item',
          quantity: qty,
          unit_price: price,
          amount: qty * price,
          sort_order: i,
        };
      });
      await supabase.from('invoice_line_items').insert(rows);
    }

    const { data: full } = await supabase
      .from('invoices')
      .select(`
        *,
        invoice_bookings(booking_id, amount, sort_order, bookings(id, service, scheduled_date, scheduled_time, total_price, date, time)),
        invoice_line_items(*)
      `)
      .eq('id', invoice.id)
      .single();

    return NextResponse.json({ invoice: full ?? invoice });
  } catch (e) {
    console.error('Invoice create error:', e);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
