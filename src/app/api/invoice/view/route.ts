import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');
    if (!token) {
      return NextResponse.json({ error: 'Token required' }, { status: 400 });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const { data: invoice, error } = await supabase
      .from('invoices')
      .select(`
        id,
        customer_id,
        business_id,
        invoice_number,
        invoice_type,
        issue_date,
        due_date,
        total_amount,
        amount_paid,
        payment_status,
        description,
        notes,
        billing_address,
        invoice_bookings(amount, bookings(service, scheduled_date, scheduled_time, total_price, date, time)),
        invoice_line_items(description, quantity, unit_price, amount)
      `)
      .eq('share_token', token)
      .single();

    if (error || !invoice) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }

    const { data: customer } = await supabase
      .from('customers')
      .select('name, email, phone, address')
      .eq('id', invoice.customer_id)
      .single();

    const { data: business } = await supabase
      .from('businesses')
      .select('name')
      .eq('id', invoice.business_id)
      .single();

    return NextResponse.json({
      invoice: {
        ...invoice,
        customer,
        business,
      },
    });
  } catch (e) {
    console.error('Invoice view error:', e);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
