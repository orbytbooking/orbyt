import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { EmailService } from '@/lib/emailService';

/**
 * POST: Process charge for a completed booking
 * Body: { method: 'cash' | 'online' }
 * - cash: Mark payment_status = paid
 * - online: Create Stripe Checkout session URL for customer to pay
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

    // online: create Stripe Checkout session
    if (!process.env.STRIPE_SECRET_KEY) {
      return NextResponse.json({ error: 'Stripe is not configured' }, { status: 500 });
    }

    const amount = Number(booking.total_price) || 0;
    const amountInCents = Math.round(amount * 100);
    if (amountInCents < 50) {
      return NextResponse.json({ error: 'Minimum charge is $0.50' }, { status: 400 });
    }

    let stripeConnectAccountId: string | null = null;
    const { data: business } = await supabase
      .from('businesses')
      .select('stripe_connect_account_id')
      .eq('id', businessId)
      .single();
    stripeConnectAccountId = (business as { stripe_connect_account_id?: string } | null)?.stripe_connect_account_id ?? null;

    const origin = process.env.NEXT_PUBLIC_APP_URL || '';
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

    const sessionParams: Stripe.Checkout.SessionCreateParams = {
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: [{
        price_data: {
          currency: 'usd',
          unit_amount: amountInCents,
          product_data: {
            name: `${booking.service ?? 'Service'} - ${booking.scheduled_date ?? ''}`,
            description: `Payment for completed booking`,
          },
        },
        quantity: 1,
      }],
      success_url: `${origin}/admin/bookings?charge=success`,
      cancel_url: `${origin}/admin/booking-charges?charge=cancel`,
      customer_email: booking.customer_email ?? undefined,
      metadata: {
        booking_id: bookingId,
        business_id: businessId,
        charge_type: 'post_service',
      },
    };

    let session;
    try {
      session = stripeConnectAccountId
        ? await stripe.checkout.sessions.create(sessionParams, { stripeAccount: stripeConnectAccountId })
        : await stripe.checkout.sessions.create(sessionParams);
    } catch (stripeErr: unknown) {
      const err = stripeErr as { type?: string; code?: string; message?: string };
      console.error('Stripe Checkout error:', err);
      const msg = err?.message ?? 'Stripe payment setup failed';
      if (err?.code === 'account_invalid' || msg.includes('account')) {
        return NextResponse.json({
          error: 'Stripe Connect account is not ready for payments. Please complete onboarding in Settings, or remove the connected account to use platform payments.',
        }, { status: 400 });
      }
      return NextResponse.json({ error: msg }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      checkoutUrl: session.url,
      message: 'Send the payment link to the customer',
    });
  } catch (e) {
    console.error('Booking charge POST:', e);
    const msg = e instanceof Error ? e.message : 'Internal server error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
