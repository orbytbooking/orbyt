import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';

// GET: Fetch gift card transactions
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const businessId = searchParams.get('business_id');
    const giftCardInstanceId = searchParams.get('gift_card_instance_id');
    const transactionType = searchParams.get('transaction_type');
    const customerId = searchParams.get('customer_id');
    const bookingId = searchParams.get('booking_id');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    if (!businessId) {
      return NextResponse.json({ error: 'Business ID is required' }, { status: 400 });
    }

    let query = supabase
      .from('gift_card_transactions')
      .select(`
        *,
        gift_card_instance:gift_card_instances(
          unique_code,
          gift_card:marketing_gift_cards(name)
        ),
        customer:customers(id, first_name, last_name, email),
        booking:bookings(id, status, total_amount),
        processed_by_user:users(id, first_name, last_name, email)
      `)
      .eq('business_id', businessId)
      .order('transaction_date', { ascending: false })
      .range(offset, offset + limit - 1);

    if (giftCardInstanceId) {
      query = query.eq('gift_card_instance_id', giftCardInstanceId);
    }
    if (transactionType) {
      query = query.eq('transaction_type', transactionType);
    }
    if (customerId) {
      query = query.eq('customer_id', customerId);
    }
    if (bookingId) {
      query = query.eq('booking_id', bookingId);
    }

    const { data, error, count } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Get total count for pagination
    const { count: totalCount } = await supabase
      .from('gift_card_transactions')
      .select('*', { count: 'exact', head: true })
      .eq('business_id', businessId);

    return NextResponse.json({
      data,
      pagination: {
        total: totalCount,
        limit,
        offset,
        has_more: offset + limit < (totalCount || 0),
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST: Create manual adjustment transaction
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      business_id,
      gift_card_instance_id,
      adjustment_type, // 'increase' or 'decrease'
      amount,
      description,
      processed_by,
    } = body;

    if (!business_id || !gift_card_instance_id || !adjustment_type || !amount) {
      return NextResponse.json({ 
        error: 'Business ID, gift card instance ID, adjustment type, and amount are required' 
      }, { status: 400 });
    }

    if (adjustment_type !== 'increase' && adjustment_type !== 'decrease') {
      return NextResponse.json({ error: 'Adjustment type must be increase or decrease' }, { status: 400 });
    }

    // Get current gift card instance
    const { data: cardInstance, error: cardError } = await supabase
      .from('gift_card_instances')
      .select('*')
      .eq('id', gift_card_instance_id)
      .eq('business_id', business_id)
      .single();

    if (cardError || !cardInstance) {
      return NextResponse.json({ error: 'Gift card not found' }, { status: 404 });
    }

    // Calculate new balance
    const adjustmentAmount = adjustment_type === 'increase' ? Math.abs(amount) : -Math.abs(amount);
    const newBalance = Number(cardInstance.current_balance) + adjustmentAmount;

    if (newBalance < 0) {
      return NextResponse.json({ error: 'Cannot decrease balance below zero' }, { status: 400 });
    }

    // Create transaction record
    const { data: transaction, error: transactionError } = await supabase
      .from('gift_card_transactions')
      .insert({
        business_id,
        gift_card_instance_id,
        transaction_type: 'adjustment',
        amount: adjustmentAmount,
        balance_before: cardInstance.current_balance,
        balance_after: newBalance,
        description: description || `Manual ${adjustment_type} adjustment`,
        processed_by,
      })
      .select()
      .single();

    if (transactionError) {
      return NextResponse.json({ error: transactionError.message }, { status: 500 });
    }

    // Update gift card balance
    const { error: updateError } = await supabase
      .from('gift_card_instances')
      .update({
        current_balance: newBalance,
        updated_at: new Date().toISOString(),
        status: newBalance <= 0 ? 'fully_redeemed' : 'active',
      })
      .eq('id', gift_card_instance_id);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    return NextResponse.json({ 
      data: {
        transaction,
        new_balance: newBalance,
        previous_balance: cardInstance.current_balance,
        adjustment_amount: adjustmentAmount,
      }
    }, { status: 201 });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
