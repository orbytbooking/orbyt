import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseClient';
import { gateMarketingTenantApi } from '@/lib/marketingTenantGate';

export async function GET(request: NextRequest) {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }
    const { searchParams } = new URL(request.url);
    const business_id = searchParams.get('business_id');

    const denied = await gateMarketingTenantApi(request, business_id);
    if (denied) return denied;

    const { data, error } = await supabaseAdmin
      .from('marketing_scripts')
      .select('*')
      .eq('business_id', business_id)
      .order('updated_at', { ascending: false });

    if (error) {
      console.error('Error fetching marketing scripts:', error);
      return NextResponse.json({ error: 'Failed to fetch marketing scripts' }, { status: 500 });
    }

    return NextResponse.json({ data });
  } catch (error) {
    console.error('Error in marketing scripts GET:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }
    const body = await request.json();
    const { business_id, title, category, content } = body;

    if (!business_id || !title || !category || !content) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const denied = await gateMarketingTenantApi(request, business_id);
    if (denied) return denied;

    const { data, error } = await supabaseAdmin
      .from('marketing_scripts')
      .insert({
        business_id,
        title: title.trim(),
        category,
        content: content.trim(),
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating marketing script:', error);
      return NextResponse.json({ error: 'Failed to create marketing script' }, { status: 500 });
    }

    return NextResponse.json({ data });
  } catch (error) {
    console.error('Error in marketing scripts POST:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }
    const body = await request.json();
    const { id, business_id, title, category, content } = body;

    if (!id || !business_id) {
      return NextResponse.json({ error: 'Script ID and Business ID are required' }, { status: 400 });
    }

    const denied = await gateMarketingTenantApi(request, business_id);
    if (denied) return denied;

    const updateData: any = {};
    if (title !== undefined) updateData.title = title.trim();
    if (category !== undefined) updateData.category = category;
    if (content !== undefined) updateData.content = content.trim();
    updateData.updated_at = new Date().toISOString();

    const { data, error } = await supabaseAdmin
      .from('marketing_scripts')
      .update(updateData)
      .eq('id', id)
      .eq('business_id', business_id)
      .select()
      .single();

    if (error) {
      console.error('Error updating marketing script:', error);
      return NextResponse.json({ error: 'Failed to update marketing script' }, { status: 500 });
    }

    return NextResponse.json({ data });
  } catch (error) {
    console.error('Error in marketing scripts PUT:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const business_id = searchParams.get('business_id');

    if (!id || !business_id) {
      return NextResponse.json({ error: 'Script ID and Business ID are required' }, { status: 400 });
    }

    const denied = await gateMarketingTenantApi(request, business_id);
    if (denied) return denied;

    const { error } = await supabaseAdmin
      .from('marketing_scripts')
      .delete()
      .eq('id', id)
      .eq('business_id', business_id);

    if (error) {
      console.error('Error deleting marketing script:', error);
      return NextResponse.json({ error: 'Failed to delete marketing script' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in marketing scripts DELETE:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
