import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

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

    // Get user's businesses
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

    return NextResponse.json({ 
      success: true, 
      data: businesses || [] 
    });

  } catch (error) {
    console.error('Business API error:', error);
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 });
  }
}
