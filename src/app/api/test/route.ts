import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  try {
    console.log('Test API called');
    
    // Log headers for debugging
    const authHeader = request.headers.get('Authorization');
    console.log('Auth header:', authHeader ? 'Present' : 'Missing');
    
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        global: {
          headers: {
            Authorization: authHeader || ''
          }
        }
      }
    );

    // Test authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    console.log('Auth result:', { user: user?.id, error: authError?.message });
    
    if (authError || !user) {
      return NextResponse.json({ 
        error: 'Auth failed', 
        details: authError?.message,
        authHeader: authHeader ? 'Present' : 'Missing'
      }, { status: 401 });
    }

    // Test businesses access
    const { data: businesses, error: bizError } = await supabase
      .from('businesses')
      .select('id, name')
      .eq('owner_id', user.id);
      
    console.log('Businesses result:', { count: businesses?.length, error: bizError?.message });

    // Test leads table access
    const { data: leads, error: leadsError } = await supabase
      .from('leads')
      .select('id, name')
      .limit(1);
      
    console.log('Leads result:', { count: leads?.length, error: leadsError?.message });

    return NextResponse.json({
      success: true,
      user: { id: user.id, email: user.email },
      businesses: businesses || [],
      leads: leads || [],
      errors: {
        auth: authError?.message,
        business: bizError?.message,
        leads: leadsError?.message
      }
    });

  } catch (error) {
    console.error('Test API error:', error);
    return NextResponse.json({ 
      error: 'Test failed', 
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
