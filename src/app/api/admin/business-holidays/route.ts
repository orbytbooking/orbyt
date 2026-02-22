import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function GET(request: NextRequest) {
  try {
    const businessId = request.headers.get('x-business-id') || request.nextUrl.searchParams.get('businessId');
    if (!businessId) {
      return NextResponse.json({ error: 'Business ID required' }, { status: 400 });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false },
    });

    const { data, error } = await supabase
      .from('business_holidays')
      .select('id, name, holiday_date, recurring')
      .eq('business_id', businessId)
      .order('holiday_date', { ascending: true });

    if (error) {
      console.error('Business holidays fetch error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ holidays: data ?? [] });
  } catch (e) {
    console.error('Business holidays GET:', e);
    return NextResponse.json({ error: 'Internal server error', holidays: [] }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const businessId = request.headers.get('x-business-id') || body.businessId;
    if (!businessId) {
      return NextResponse.json({ error: 'Business ID required' }, { status: 400 });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false },
    });

    const { data, error } = await supabase
      .from('business_holidays')
      .insert({
        business_id: businessId,
        name: String(body.name || 'Holiday').trim(),
        holiday_date: body.holiday_date,
        recurring: !!body.recurring,
      })
      .select()
      .single();

    if (error) {
      console.error('Business holidays insert error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ holiday: data });
  } catch (e) {
    console.error('Business holidays POST:', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const id = body.id || request.nextUrl.searchParams.get('id');
    const businessId = request.headers.get('x-business-id') || body.businessId;
    if (!id || !businessId) {
      return NextResponse.json({ error: 'id and businessId required' }, { status: 400 });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false },
    });

    const update: Record<string, unknown> = {};
    if (body.name != null) update.name = String(body.name).trim();
    if (body.holiday_date != null) update.holiday_date = body.holiday_date;
    if (typeof body.recurring === 'boolean') update.recurring = body.recurring;

    if (Object.keys(update).length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('business_holidays')
      .update(update)
      .eq('id', id)
      .eq('business_id', businessId)
      .select()
      .single();

    if (error) {
      console.error('Business holidays update error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ holiday: data });
  } catch (e) {
    console.error('Business holidays PATCH:', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const id = request.nextUrl.searchParams.get('id');
    const businessId = request.headers.get('x-business-id') || request.nextUrl.searchParams.get('businessId');
    if (!id || !businessId) {
      return NextResponse.json({ error: 'id and businessId required' }, { status: 400 });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false },
    });

    const { error } = await supabase
      .from('business_holidays')
      .delete()
      .eq('id', id)
      .eq('business_id', businessId);

    if (error) {
      console.error('Business holidays delete error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error('Business holidays DELETE:', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
