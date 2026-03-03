import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import { EmailService } from '@/lib/emailService';
import { createCheckout } from '@/lib/payments/createCheckout';

/**
 * POST: Process charge for a completed booking
 * Body: { method: 'cash' | 'online' | 'void' }
 * - cash: Mark payment_status = paid
 * - online: Create checkout session URL (Stripe or Worldpay per business) for customer to pay
 * - void: Mark payment voided
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: bookingId } = await params;
    const businessId = request.headers.get('x-business-id');
    if (!businessId || !bookingId) {
      return NextResponse.json({ error: 'Business ID and booking ID required' }, { status: 400 });
    }

    const body = await request.json();
    const method = (body.method ?? 'cash') as 'cash' | 'online' | 'void';

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data: booking, error: fetchErr } = await supabase
      .from('bookings')
      .select('id, total_price, customer_email, customer_name, service, scheduled_date, business_id')
      .eq('id', bookingId)
      .eq('business_id', businessId)
      .single();

    if (fetchErr || !booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    }

    if (method === 'cash') {
      const { error: updateErr } = await supabase
        .from('bookings')
        .update({ payment_status: 'paid', updated_at: new Date().toISOString() })
        .eq('id', bookingId)
        .eq('business_id', businessId);

      if (updateErr) {
        return NextResponse.json({ error: 'Failed to update payment status' }, { status: 500 });
      }

      const custEmail = (booking as { customer_email?: string }).customer_email;
      if (custEmail) {
        try {
          const { data: biz } = await supabase.from('businesses').select('name').eq('id', businessId).single();
          const bkRef = `BK${String(bookingId).slice(-6).toUpperCase()}`;
          const emailService = new EmailService();
          await emailService.sendReceiptEmail({
            to: custEmail,
            customerName: (booking as { customer_name?: string }).customer_name ?? 'Customer',
            businessName: (biz as { name?: string } | null)?.name ?? 'Your Business',
            service: (booking as { service?: string }).service ?? null,
            amount: Number((booking as { total_price?: number }).total_price ?? 0),
            bookingRef: bkRef,
            paymentMethod: 'cash',
          });
        } catch (e) {
          console.warn('Receipt email (cash) failed:', e);
        }
      }

      return NextResponse.json({
        success: true,
        message: 'Marked as paid (cash/check)',
      });
    }

    if (method === 'void') {
      const { error: updateErr } = await supabase
        .from('bookings')
        .update({ payment_status: 'voided', updated_at: new Date().toISOString() })
        .eq('id', bookingId)
        .eq('business_id', businessId);

      if (updateErr) {
        return NextResponse.json({ error: 'Failed to void payment' }, { status: 500 });
      }
      return NextResponse.json({
        success: true,
        message: 'Payment voided ($0)',
      });
    }

    // online: create checkout session (Stripe or Worldpay per business payment_provider)
    const amount = Number(booking.total_price) || 0;
    const amountInCents = Math.round(amount * 100);
    if (amountInCents < 50) {
      return NextResponse.json({ error: 'Minimum charge is $0.50' }, { status: 400 });
    }

    const origin = process.env.NEXT_PUBLIC_APP_URL || '';
    let checkoutUrl: string;
    try {
      const result = await createCheckout(
        {
          bookingId,
          amountInCents,
          customerEmail: booking.customer_email ?? undefined,
          businessId,
          successUrl: `${origin}/admin/bookings?charge=success`,
          cancelUrl: `${origin}/admin/booking-charges?charge=cancel`,
          lineItemDescription: `${booking.service ?? 'Service'} - ${booking.scheduled_date ?? ''}`,
          origin,
        },
        supabase
      );
      checkoutUrl = result.url;
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Checkout setup failed';
      const status = msg.includes('not configured') ? 500 : 400;
      return NextResponse.json({ error: msg }, { status });
    }

    return NextResponse.json({
      success: true,
      checkoutUrl,
      message: 'Send the payment link to the customer',
    });
  } catch (e) {
    console.error('Booking charge POST:', e);
    const msg = e instanceof Error ? e.message : 'Internal server error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
