import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { gateMarketingTenantApi } from '@/lib/marketingTenantGate';
import { sendGiftCardEmail } from '@/lib/sendGiftCardEmail';
import { resolveBusinessBookNowUrl } from '@/lib/resolveBusinessBookNowUrl';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseServiceKey) {
  throw new Error('SUPABASE_SERVICE_ROLE_KEY is not configured');
}

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

const MAX_RESENDS_PER_DAY = 3;
const RESEND_LOG_PREFIX = 'Gift card email resent';

async function countRecentResends(businessId: string, instanceId: string): Promise<number> {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { count, error } = await supabaseAdmin
    .from('gift_card_transactions')
    .select('id', { count: 'exact', head: true })
    .eq('business_id', businessId)
    .eq('gift_card_instance_id', instanceId)
    .eq('transaction_type', 'adjustment')
    .gte('transaction_date', since)
    .ilike('description', `${RESEND_LOG_PREFIX}%`);

  if (error) {
    console.warn('[gift-card resend] rate limit count failed:', error.message);
    return 0;
  }
  return count ?? 0;
}

/** POST: Resend gift card notification email for an active instance. */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const businessId = new URL(request.url).searchParams.get('business_id');

    if (!businessId) {
      return NextResponse.json({ error: 'Business ID is required' }, { status: 400 });
    }

    const gate = await gateMarketingTenantApi(request, businessId);
    if (gate) return gate;

    const { data: instance, error: fetchError } = await supabaseAdmin
      .from('gift_card_instances')
      .select(
        `
        id,
        business_id,
        gift_card_id,
        unique_code,
        original_amount,
        current_balance,
        purchaser_email,
        recipient_email,
        expires_at,
        status,
        message,
        gift_card:marketing_gift_cards(name, amount, active)
      `,
      )
      .eq('id', id)
      .eq('business_id', businessId)
      .maybeSingle();

    if (fetchError) {
      return NextResponse.json({ error: fetchError.message }, { status: 500 });
    }

    if (!instance) {
      return NextResponse.json({ error: 'Gift card instance not found' }, { status: 404 });
    }

    if (instance.status !== 'active') {
      return NextResponse.json(
        { error: 'Only active gift cards can be resent' },
        { status: 400 },
      );
    }

    const recipientEmail = String(instance.recipient_email ?? '').trim();
    if (!recipientEmail) {
      return NextResponse.json(
        { error: 'This gift card has no recipient email on file' },
        { status: 400 },
      );
    }

    const recentResends = await countRecentResends(businessId, id);
    if (recentResends >= MAX_RESENDS_PER_DAY) {
      return NextResponse.json(
        {
          error: `Resend limit reached (${MAX_RESENDS_PER_DAY} per 24 hours). Try again later.`,
        },
        { status: 429 },
      );
    }

    const giftCard = instance.gift_card as { name?: string; amount?: number; active?: boolean } | null;
    if (!giftCard?.name) {
      return NextResponse.json({ error: 'Gift card template not found' }, { status: 404 });
    }

    const { data: businessRow } = await supabaseAdmin
      .from('businesses')
      .select('name')
      .eq('id', businessId)
      .maybeSingle();

    const businessName = String(businessRow?.name ?? 'Your service provider').trim();
    const purchaserEmail = String(instance.purchaser_email ?? '').trim();
    const purchaserName =
      purchaserEmail && purchaserEmail.includes('@')
        ? purchaserEmail.split('@')[0]
        : 'Someone special';

    const sent = await sendGiftCardEmail({
      recipientEmail,
      recipientName: recipientEmail.split('@')[0] || 'there',
      purchaserName,
      businessName,
      giftCardName: giftCard.name,
      amount: Number(instance.original_amount ?? giftCard.amount ?? 0),
      uniqueCode: String(instance.unique_code),
      expiresAt: String(instance.expires_at),
      message: instance.message,
      bookNowUrl: resolveBusinessBookNowUrl(businessId, {
        giftCardCode: String(instance.unique_code),
        requestOrigin: request.nextUrl.origin,
      }),
    });

    if (!sent) {
      return NextResponse.json({ error: 'Failed to send gift card email' }, { status: 500 });
    }

    await supabaseAdmin.from('gift_card_transactions').insert({
      business_id: businessId,
      gift_card_instance_id: id,
      transaction_type: 'adjustment',
      amount: 0,
      balance_before: instance.current_balance,
      balance_after: instance.current_balance,
      description: `${RESEND_LOG_PREFIX} to ${recipientEmail}`,
    });

    return NextResponse.json({
      success: true,
      sent: true,
      to: recipientEmail,
      resends_remaining: Math.max(0, MAX_RESENDS_PER_DAY - recentResends - 1),
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
