import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { supabaseAdmin } from '@/lib/supabaseClient';

const couponSchema = z.object({
  business_id: z.string().uuid('Business ID is required'),
  name: z.string().optional().nullable(),
  code: z.string().min(1, 'Coupon code is required'),
  description: z.string().optional().nullable(),
  discount_type: z.enum(['percentage', 'fixed']),
  discount_value: z.number().min(0, 'Discount value must be 0 or greater'),
  start_date: z.string().optional().nullable(),
  end_date: z.string().optional().nullable(),
  usage_limit: z.number().int().min(1).optional().nullable(),
  min_order: z.number().min(0).optional().nullable(),
  active: z.boolean().optional().default(true),
  facebook_coupon: z.boolean().optional().default(false),
  allow_gift_cards: z.boolean().optional().default(false),
  allow_referrals: z.boolean().optional().default(false),
  coupon_config: z.record(z.any()).optional(),
});

function normalizeCode(code: string) {
  return code.trim().toUpperCase();
}

export async function GET(request: NextRequest) {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Service role key is not configured' }, { status: 500 });
    }

    const { searchParams } = new URL(request.url);
    const businessId = searchParams.get('business_id');
    const id = searchParams.get('id');
    const active = searchParams.get('active');

    if (!businessId) {
      return NextResponse.json({ error: 'Business ID is required' }, { status: 400 });
    }

    let query = supabaseAdmin
      .from('marketing_coupons')
      .select('*')
      .eq('business_id', businessId)
      .order('created_at', { ascending: false });

    if (id) {
      query = query.eq('id', id);
    }

    if (active !== null) {
      query = query.eq('active', active === 'true');
    }

    const { data, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data: id ? data?.[0] ?? null : data });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Service role key is not configured' }, { status: 500 });
    }

    const body = await request.json();
    const validated = couponSchema.parse(body);
    const normalizedCode = normalizeCode(validated.code);

    const { data: existingCoupon } = await supabaseAdmin
      .from('marketing_coupons')
      .select('id')
      .eq('business_id', validated.business_id)
      .eq('code', normalizedCode)
      .maybeSingle();

    if (existingCoupon) {
      return NextResponse.json({ error: 'Coupon code already exists' }, { status: 409 });
    }

    const payload = {
      ...validated,
      code: normalizedCode,
      name: validated.name?.trim() || null,
      description: validated.description?.trim() || null,
    };

    const { data, error } = await supabaseAdmin
      .from('marketing_coupons')
      .insert(payload)
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

export async function PUT(request: NextRequest) {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Service role key is not configured' }, { status: 500 });
    }

    const body = await request.json();
    const { id, ...updateData } = body;

    if (!id) {
      return NextResponse.json({ error: 'Coupon ID is required' }, { status: 400 });
    }

    const validated = couponSchema.partial().parse(updateData);

    if (!validated.business_id) {
      return NextResponse.json({ error: 'Business ID is required' }, { status: 400 });
    }

    if (validated.code) {
      const normalizedCode = normalizeCode(validated.code);
      const { data: existingCoupon } = await supabaseAdmin
        .from('marketing_coupons')
        .select('id')
        .eq('business_id', validated.business_id)
        .eq('code', normalizedCode)
        .neq('id', id)
        .maybeSingle();

      if (existingCoupon) {
        return NextResponse.json({ error: 'Coupon code already exists' }, { status: 409 });
      }
      validated.code = normalizedCode;
    }

    const payload = {
      ...validated,
      name: validated.name !== undefined ? validated.name?.trim() || null : undefined,
      description:
        validated.description !== undefined ? validated.description?.trim() || null : undefined,
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabaseAdmin
      .from('marketing_coupons')
      .update(payload)
      .eq('id', id)
      .eq('business_id', validated.business_id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!data) {
      return NextResponse.json({ error: 'Coupon not found' }, { status: 404 });
    }

    return NextResponse.json({ data });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Service role key is not configured' }, { status: 500 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const businessId = searchParams.get('business_id');

    if (!id || !businessId) {
      return NextResponse.json({ error: 'Coupon ID and business ID are required' }, { status: 400 });
    }

    const { error } = await supabaseAdmin
      .from('marketing_coupons')
      .delete()
      .eq('id', id)
      .eq('business_id', businessId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ message: 'Coupon deleted successfully' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
