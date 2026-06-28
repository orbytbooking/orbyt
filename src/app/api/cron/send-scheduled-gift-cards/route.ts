/**
 * Cron: send gift cards scheduled for delivery (status pending_send).
 * Production: Authorization: Bearer <CRON_SECRET>
 */
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { sendGiftCardInstanceEmail } from '@/lib/giftCardLifecycle';

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Missing Supabase config');
  return createClient(url, key, { auth: { persistSession: false } });
}

export async function GET(request: NextRequest) {
  return handleRequest(request);
}

export async function POST(request: NextRequest) {
  return handleRequest(request);
}

async function handleRequest(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;
    const isProduction = process.env.NODE_ENV === 'production';

    if (isProduction && !cronSecret) {
      console.error('[send-scheduled-gift-cards] CRON_SECRET is not set in production');
      return NextResponse.json(
        { error: 'Cron endpoint misconfigured: CRON_SECRET required in production' },
        { status: 500 },
      );
    }

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = getSupabase();
    const nowIso = new Date().toISOString();

    const { data: dueRows, error: fetchError } = await supabase
      .from('gift_card_instances')
      .select(
        `
        id,
        business_id,
        gift_card_id,
        unique_code,
        original_amount,
        purchaser_email,
        recipient_email,
        recipient_name,
        purchaser_name,
        expires_at,
        message,
        email_image_url,
        scheduled_send_at,
        gift_card:marketing_gift_cards(name, amount, active)
      `,
      )
      .eq('status', 'pending_send')
      .not('scheduled_send_at', 'is', null)
      .lte('scheduled_send_at', nowIso)
      .order('scheduled_send_at', { ascending: true })
      .limit(50);

    if (fetchError) {
      console.error('[send-scheduled-gift-cards] fetch:', fetchError);
      return NextResponse.json({ error: fetchError.message }, { status: 500 });
    }

    let sent = 0;
    let failed = 0;
    const results: { id: string; ok: boolean; error?: string }[] = [];

    for (const row of dueRows ?? []) {
      const giftCard = row.gift_card as { name?: string; amount?: number; active?: boolean } | null;
      if (!giftCard?.name) {
        failed += 1;
        results.push({ id: row.id, ok: false, error: 'Template missing' });
        continue;
      }

      const emailResult = await sendGiftCardInstanceEmail(supabase, {
        businessId: row.business_id,
        instance: { ...row, gift_card: giftCard },
        requestOrigin: request.nextUrl.origin,
      });

      if (!emailResult.sent) {
        failed += 1;
        results.push({ id: row.id, ok: false, error: emailResult.error });
        continue;
      }

      const { error: activateError } = await supabase
        .from('gift_card_instances')
        .update({
          status: 'active',
          scheduled_send_at: null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', row.id)
        .eq('business_id', row.business_id)
        .eq('status', 'pending_send');

      if (activateError) {
        failed += 1;
        results.push({ id: row.id, ok: false, error: activateError.message });
        continue;
      }

      await supabase.from('gift_card_transactions').insert({
        business_id: row.business_id,
        gift_card_instance_id: row.id,
        transaction_type: 'adjustment',
        amount: 0,
        balance_before: row.original_amount,
        balance_after: row.original_amount,
        description: `Scheduled gift card email sent to ${emailResult.to}`,
      });

      sent += 1;
      results.push({ id: row.id, ok: true });
    }

    return NextResponse.json({
      ok: true,
      processed: (dueRows ?? []).length,
      sent,
      failed,
      results,
    });
  } catch (e) {
    console.error('[send-scheduled-gift-cards]', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
