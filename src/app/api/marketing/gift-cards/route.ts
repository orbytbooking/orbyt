import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseServiceKey) {
  throw new Error('SUPABASE_SERVICE_ROLE_KEY is not configured');
}

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

// Schema for creating gift card templates
const createGiftCardSchema = z.object({
  business_id: z.string().uuid('Business ID is required'),
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional(),
  code: z.string().min(1, 'Code is required'),
  amount: z.number().min(0.01, 'Amount must be greater than 0'),
  active: z.boolean().default(true),
  expires_in_months: z.number().min(1).max(60).default(12),
  auto_generate_codes: z.boolean().default(true),
});

// GET: Fetch gift card templates
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const businessId = searchParams.get('business_id');
    const active = searchParams.get('active');

    if (!businessId) {
      return NextResponse.json({ error: 'Business ID is required' }, { status: 400 });
    }

    let query = supabaseAdmin
      .from('marketing_gift_cards')
      .select('*')
      .eq('business_id', businessId)
      .order('created_at', { ascending: false });

    if (active !== null) {
      query = query.eq('active', active === 'true');
    }

    const { data, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST: Create new gift card template
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = createGiftCardSchema.parse(body);

    // Check if code already exists for this business
    const { data: existingCard } = await supabaseAdmin
      .from('marketing_gift_cards')
      .select('id')
      .eq('business_id', validatedData.business_id)
      .eq('code', validatedData.code)
      .single();

    if (existingCard) {
      return NextResponse.json({ error: 'Gift card code already exists' }, { status: 409 });
    }

    const { data, error } = await supabaseAdmin
      .from('marketing_gift_cards')
      .insert(validatedData)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data }, { status: 201 });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PUT: Update gift card template
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, ...updateData } = body;

    if (!id) {
      return NextResponse.json({ error: 'Gift card ID is required' }, { status: 400 });
    }

    const validatedData = createGiftCardSchema.partial().parse(updateData);

    const { data, error } = await supabaseAdmin
      .from('marketing_gift_cards')
      .update({
        ...validatedData,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('business_id', validatedData.business_id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!data) {
      return NextResponse.json({ error: 'Gift card not found' }, { status: 404 });
    }

    return NextResponse.json({ data });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE: Delete gift card template
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const businessId = searchParams.get('business_id');

    if (!id || !businessId) {
      return NextResponse.json({ error: 'Gift card ID and business ID are required' }, { status: 400 });
    }

    const { error } = await supabaseAdmin
      .from('marketing_gift_cards')
      .delete()
      .eq('id', id)
      .eq('business_id', businessId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ message: 'Gift card deleted successfully' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
