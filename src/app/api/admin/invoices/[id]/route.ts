import { NextRequest, NextResponse } from 'next/server';
import {
  requireAdminTenantContext,
  assertBusinessIdMatchesContext,
} from '@/lib/adminTenantContext';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const ctx = await requireAdminTenantContext(request);
    if (ctx instanceof NextResponse) return ctx;
    const { supabase, businessId } = ctx;

    const hinted =
      request.headers.get('x-business-id')?.trim() ||
      request.nextUrl.searchParams.get('business_id')?.trim() ||
      null;
    const mismatch = assertBusinessIdMatchesContext(hinted, businessId);
    if (mismatch) return mismatch;

    const { id } = await params;

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

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const ctx = await requireAdminTenantContext(request);
    if (ctx instanceof NextResponse) return ctx;
    const { supabase, businessId } = ctx;

    const { id } = await params;

    const body = await request.json();
    const hinted =
      (typeof body.business_id === 'string' ? body.business_id.trim() : '') ||
      request.headers.get('x-business-id')?.trim() ||
      null;
    const mismatch = assertBusinessIdMatchesContext(hinted, businessId);
    if (mismatch) return mismatch;

    const { data: existing } = await supabase
      .from('invoices')
      .select('id')
      .eq('id', id)
      .eq('business_id', businessId)
      .single();

    if (!existing) return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });

    const update: Record<string, unknown> = {};
    const allowed = [
      'status',
      'payment_status',
      'issue_date',
      'due_date',
      'total_amount',
      'amount_paid',
      'description',
      'notes',
      'billing_address',
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

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const ctx = await requireAdminTenantContext(request);
    if (ctx instanceof NextResponse) return ctx;
    const { supabase, businessId } = ctx;

    const hinted =
      request.headers.get('x-business-id')?.trim() ||
      request.nextUrl.searchParams.get('business_id')?.trim() ||
      null;
    const mismatch = assertBusinessIdMatchesContext(hinted, businessId);
    if (mismatch) return mismatch;

    const { id } = await params;

    const { error } = await supabase.from('invoices').delete().eq('id', id).eq('business_id', businessId);

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
