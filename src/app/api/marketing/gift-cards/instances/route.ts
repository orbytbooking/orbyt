import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';
import { sendGiftCardEmail } from '@/lib/sendGiftCardEmail';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseServiceKey) {
  throw new Error('SUPABASE_SERVICE_ROLE_KEY is not configured');
}

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

// Schema for purchasing/creating gift card instances
const purchaseGiftCardSchema = z.object({
  business_id: z.string().uuid('Business ID is required'),
  gift_card_id: z.string().uuid('Gift card ID is required'),
  purchaser_id: z.string().uuid().optional(),
  recipient_id: z.string().uuid().optional(),
  purchaser_email: z.string().email().optional(),
  recipient_email: z.string().email().optional(),
  recipient_name: z.string().optional(),
  purchaser_name: z.string().optional(),
  message: z.string().optional(),
  quantity: z.number().min(1).max(10).default(1),
  send_email: z.boolean().optional().default(true),
});

// GET: Fetch gift card instances
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const businessId = searchParams.get('business_id');
    const status = searchParams.get('status');
    const purchaserEmail = searchParams.get('purchaser_email');
    const recipientEmail = searchParams.get('recipient_email');
    const uniqueCode = searchParams.get('unique_code');

    if (!businessId) {
      return NextResponse.json({ error: 'Business ID is required' }, { status: 400 });
    }

    let query = supabaseAdmin
      .from('gift_card_instances')
      .select(`
        *,
        gift_card:marketing_gift_cards(name, description, amount)
      `)
      .eq('business_id', businessId)
      .order('created_at', { ascending: false });

    if (status) {
      query = query.eq('status', status);
    }
    if (purchaserEmail) {
      query = query.eq('purchaser_email', purchaserEmail);
    }
    if (recipientEmail) {
      query = query.eq('recipient_email', recipientEmail);
    }
    if (uniqueCode) {
      query = query.eq('unique_code', uniqueCode);
    }

    const { data, error } = await query;

    if (error) {
      console.error('GET error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data });
  } catch (error: any) {
    console.error('GET catch error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST: Purchase/create gift card instances
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    console.log('🔍 Received purchase request:', JSON.stringify(body, null, 2));
    
    const validatedData = purchaseGiftCardSchema.parse(body);
    console.log('✅ Validated data:', JSON.stringify(validatedData, null, 2));

    // Get the gift card template
    console.log('🎁 Looking up gift card template:', validatedData.gift_card_id);
    const { data: giftCard, error: giftCardError } = await supabaseAdmin
      .from('marketing_gift_cards')
      .select('*')
      .eq('id', validatedData.gift_card_id)
      .eq('business_id', validatedData.business_id)
      .eq('active', true)
      .single();

    console.log('🎁 Gift card lookup result:', { giftCard, error: giftCardError });

    if (giftCardError || !giftCard) {
      console.error('❌ Gift card error:', giftCardError);
      return NextResponse.json({ error: 'Gift card not found or inactive', details: giftCardError?.message }, { status: 404 });
    }

    // Calculate expiration date
    const expiresAt = new Date();
    expiresAt.setMonth(expiresAt.getMonth() + giftCard.expires_in_months);

    // Create gift card instances
    const instances = [];
    for (let i = 0; i < validatedData.quantity; i++) {
      const uniqueCode = await generateUniqueGiftCardCode();
      
      const instance = {
        business_id: validatedData.business_id,
        gift_card_id: validatedData.gift_card_id,
        unique_code: uniqueCode,
        original_amount: giftCard.amount,
        current_balance: giftCard.amount,
        purchaser_id: validatedData.purchaser_id || null,
        recipient_id: validatedData.recipient_id || null,
        purchaser_email: validatedData.purchaser_email || null,
        recipient_email: validatedData.recipient_email || null,
        purchase_date: new Date().toISOString(),
        expires_at: expiresAt.toISOString(),
        status: 'active',
        message: validatedData.message || null,
      };
      
      instances.push(instance);
    }

    console.log('🛍️ Creating instances:', instances);

    // Insert all instances
    const { data, error } = await supabaseAdmin
      .from('gift_card_instances')
      .insert(instances)
      .select();

    if (error) {
      console.error('❌ Insert error:', error);
      return NextResponse.json({ error: error.message, details: error }, { status: 500 });
    }

    console.log('✅ Inserted instances:', data);

    const emailResults: { instance_id: string; sent: boolean }[] = [];
    if (validatedData.send_email && Array.isArray(data) && data.length > 0) {
      const { data: businessRow } = await supabaseAdmin
        .from('businesses')
        .select('name, website')
        .eq('id', validatedData.business_id)
        .maybeSingle();

      const businessName = String(businessRow?.name ?? 'Your service provider').trim();
      const website = String(businessRow?.website ?? '').trim();
      const appBase = (process.env.NEXT_PUBLIC_APP_URL ?? '').replace(/\/$/, '');
      const bookNowUrl =
        website && /^https?:\/\//i.test(website)
          ? website
          : appBase
            ? `${appBase}/book-now?business=${validatedData.business_id}`
            : null;

      const purchaserName =
        validatedData.purchaser_name?.trim() ||
        validatedData.purchaser_email?.trim() ||
        'Someone special';

      for (const row of data) {
        const recipientEmail = String(row.recipient_email ?? '').trim();
        if (!recipientEmail) {
          emailResults.push({ instance_id: row.id, sent: false });
          continue;
        }
        const sent = await sendGiftCardEmail({
          recipientEmail,
          recipientName:
            validatedData.recipient_name?.trim() ||
            recipientEmail.split('@')[0] ||
            'there',
          purchaserName,
          businessName,
          giftCardName: giftCard.name,
          amount: Number(row.original_amount ?? giftCard.amount),
          uniqueCode: String(row.unique_code),
          expiresAt: String(row.expires_at),
          message: row.message ?? validatedData.message,
          bookNowUrl,
        });
        emailResults.push({ instance_id: row.id, sent });
      }
    }

    return NextResponse.json({ data, email_results: emailResults }, { status: 201 });
  } catch (error: any) {
    console.error('❌ POST error:', error);
    if (error instanceof z.ZodError) {
      console.error('❌ Validation error:', error.errors);
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    console.error('❌ General error:', error.message, error.stack);
    return NextResponse.json({ error: error.message, stack: error.stack }, { status: 500 });
  }
}

// Helper function to generate unique gift card code
async function generateUniqueGiftCardCode(): Promise<string> {
  const maxAttempts = 10;
  
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    // Generate 8-character alphanumeric code
    const code = Math.random().toString(36).substring(2, 10).toUpperCase();
    
    // Check if code already exists
    const { data } = await supabaseAdmin
      .from('gift_card_instances')
      .select('unique_code')
      .eq('unique_code', code)
      .single();
    
    if (!data) {
      return code;
    }
  }
  
  // If all attempts fail, generate with timestamp
  return Math.random().toString(36).substring(2, 10).toUpperCase() + Date.now().toString(36).substring(-4).toUpperCase();
}
