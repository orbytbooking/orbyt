import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getAuthenticatedUser, createUnauthorizedResponse, createForbiddenResponse } from '@/lib/auth-helpers';

export async function GET() {
  try {
    // Authenticate user
    const user = await getAuthenticatedUser();
    if (!user) {
      return createUnauthorizedResponse();
    }

    // Check user role - only allow owners and admins
    const userRole = user.user_metadata?.role || 'owner';
    if (userRole === 'customer') {
      return createForbiddenResponse('Customers cannot access admin endpoints');
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Get the user's business
    const { data: business, error: businessError } = await supabase
      .from('businesses')
      .select('id')
      .eq('owner_id', user.id)
      .single();
    
    if (businessError || !business) {
      return NextResponse.json({ error: 'Business not found' }, { status: 404 });
    }

    // Get website config
    const { data: config, error: configError } = await supabase
      .from('business_website_configs')
      .select('config')
      .eq('business_id', business.id)
      .single();

    if (configError && configError.code !== 'PGRST116') {
      return NextResponse.json({ error: configError.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      config: config?.config || null
    });

  } catch (error) {
    console.error('Website config GET error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    // Authenticate user
    const user = await getAuthenticatedUser();
    if (!user) {
      return createUnauthorizedResponse();
    }

    // Check user role - only allow owners and admins
    const userRole = user.user_metadata?.role || 'owner';
    if (userRole === 'customer') {
      return createForbiddenResponse('Customers cannot access admin endpoints');
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Get the user's business
    const { data: business, error: businessError } = await supabase
      .from('businesses')
      .select('id')
      .eq('owner_id', user.id)
      .single();
    
    if (businessError || !business) {
      return NextResponse.json({ error: 'Business not found' }, { status: 404 });
    }

    const { config } = await request.json();

    if (!config || typeof config !== 'object') {
      return NextResponse.json({ error: 'Invalid config data' }, { status: 400 });
    }

    // Upsert website config
    const { data: result, error: upsertError } = await supabase
      .from('business_website_configs')
      .upsert({
        business_id: business.id,
        config: config,
        updated_at: new Date().toISOString()
      })
      .select('config')
      .single();

    if (upsertError) {
      console.error('Website config upsert error:', upsertError);
      return NextResponse.json({ error: upsertError.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      config: result.config
    });

  } catch (error) {
    console.error('Website config POST error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
