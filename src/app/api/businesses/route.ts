import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Scoped, read-only lookup by id (used by book-now, login branding, useWebsiteConfig).
 * Does not require auth; only returns id, name, plan, category. Caller must know the UUID.
 */
async function getBusinessByIdForPublicLookup(businessId: string) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) {
    return { error: NextResponse.json({ error: 'Server configuration error' }, { status: 500 }) };
  }
  if (!UUID_RE.test(businessId)) {
    return { error: NextResponse.json({ error: 'Invalid business id' }, { status: 400 }) };
  }
  const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });
  const { data: row, error } = await admin
    .from('businesses')
    .select('id, name, plan, category')
    .eq('id', businessId)
    .maybeSingle();
  if (error) {
    console.error('Business lookup by id:', error);
    return { error: NextResponse.json({ error: 'Failed to fetch business' }, { status: 500 }) };
  }
  if (!row) {
    const empty: unknown[] = [];
    return {
      body: NextResponse.json({
        success: true,
        data: empty,
        businesses: empty,
      }),
    };
  }
  const list = [row];
  return {
    body: NextResponse.json({
      success: true,
      data: list,
      businesses: list,
    }),
  };
}

export async function POST(request: Request) {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        global: {
          headers: {
            Authorization: request.headers.get('Authorization') || ''
          }
        }
      }
    );

    // Get user session using the token from Authorization header
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      console.error('Auth error:', authError);
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { name, category = 'general' } = body;

    if (!name || name.trim() === '') {
      return NextResponse.json({ error: 'Business name is required' }, { status: 400 });
    }

    // Create the business
    const { data: business, error: businessError } = await supabase
      .from('businesses')
      .insert({
        name: name.trim(),
        category,
        owner_id: user.id,
        plan: 'starter'
      })
      .select()
      .single();

    if (businessError) {
      console.error('Business creation error:', businessError);
      return NextResponse.json({ 
        error: 'Failed to create business',
        details: businessError.message 
      }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      data: business 
    });

  } catch (error) {
    console.error('Business API error:', error);
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 });
  }
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const businessIdParam = url.searchParams.get('business_id')?.trim() ?? '';

    if (businessIdParam) {
      const result = await getBusinessByIdForPublicLookup(businessIdParam);
      if ('error' in result && result.error) return result.error;
      if ('body' in result && result.body) return result.body;
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        global: {
          headers: {
            Authorization: request.headers.get('Authorization') || ''
          }
        }
      }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      console.error('Auth error:', authError);
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: businesses, error: businessesError } = await supabase
      .from('businesses')
      .select('id, name, plan, category')
      .eq('owner_id', user.id)
      .order('created_at', { ascending: false });

    if (businessesError) {
      console.error('Business fetch error:', businessesError);
      return NextResponse.json({ 
        error: 'Failed to fetch businesses',
        details: businessesError.message 
      }, { status: 500 });
    }

    const list = businesses || [];
    return NextResponse.json({ 
      success: true, 
      data: list,
      businesses: list,
    });

  } catch (error) {
    console.error('Business API error:', error);
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 });
  }
}
