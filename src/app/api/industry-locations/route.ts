import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const businessId = searchParams.get('business_id');
    const industryId = searchParams.get('industry_id');

    if (!businessId || !industryId) {
      return NextResponse.json({ error: 'business_id and industry_id are required' }, { status: 400 });
    }

    const { data: links, error: linksError } = await supabase
      .from('industry_location')
      .select('location_id')
      .eq('business_id', businessId)
      .eq('industry_id', industryId);

    if (linksError) {
      return NextResponse.json({ error: linksError.message }, { status: 500 });
    }

    const locationIds = (links || [])
      .map((row: any) => row.location_id)
      .filter((id: any) => typeof id === 'string' && id.trim().length > 0);

    if (locationIds.length === 0) {
      return NextResponse.json({ locations: [] });
    }

    const { data: locations, error: locationsError } = await supabase
      .from('locations')
      .select('*')
      .eq('business_id', businessId)
      .in('id', locationIds)
      .order('created_at', { ascending: false });

    if (locationsError) {
      return NextResponse.json({ error: locationsError.message }, { status: 500 });
    }

    return NextResponse.json({ locations: locations || [] });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
