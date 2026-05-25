import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';
import { z } from 'zod';

// Schema for redeeming gift cards
const redeemGiftCardSchema = z.object({
  business_id: z.string().uuid('Business ID is required'),
  unique_code: z.string().min(1, 'Gift card code is required'),
  redemption_amount: z.number().min(0.01, 'Redemption amount must be greater than 0'),
  booking_id: z.string().uuid().optional(),
  customer_id: z.string().uuid().optional(),
  description: z.string().optional(),
});

// POST: Redeem a gift card
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = redeemGiftCardSchema.parse(body);

    // Call the database function to redeem the gift card
    const { data, error } = await supabase
      .rpc('redeem_gift_card', {
        card_code: validatedData.unique_code,
        business_uuid: validatedData.business_id,
        redemption_amount: validatedData.redemption_amount,
        booking_uuid: validatedData.booking_id,
        customer_uuid: validatedData.customer_id,
        transaction_description: validatedData.description,
      });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!data || data.length === 0) {
      return NextResponse.json({ error: 'Redemption failed' }, { status: 400 });
    }

    const result = data[0];

    if (!result.success) {
      return NextResponse.json({ 
        error: result.error_message || 'Redemption failed',
        code: result.error_message?.includes('not found') ? 'NOT_FOUND' : 
              result.error_message?.includes('expired') ? 'EXPIRED' :
              result.error_message?.includes('balance') ? 'INSUFFICIENT_BALANCE' : 'INVALID'
      }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      instance_id: result.instance_id,
      amount_redeemed: result.amount_redeemed,
      remaining_balance: result.remaining_balance,
      transaction_id: result.transaction_id,
    });

  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// GET: Validate a gift card (check balance and validity)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const businessId = searchParams.get('business_id');
    const uniqueCode = searchParams.get('unique_code');

    if (!businessId || !uniqueCode) {
      return NextResponse.json({ error: 'Business ID and gift card code are required' }, { status: 400 });
    }

    // Call the database function to validate the gift card
    const { data, error } = await supabase
      .rpc('validate_gift_card', {
        card_code: uniqueCode,
        business_uuid: businessId,
      });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!data || data.length === 0) {
      return NextResponse.json({ error: 'Validation failed' }, { status: 400 });
    }

    const result = data[0];

    return NextResponse.json({
      valid: result.valid,
      instance_id: result.instance_id,
      current_balance: result.current_balance,
      expires_at: result.expires_at,
      status: result.status,
      error_message: result.error_message,
    });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
