import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { MultiTenantHelper } from '@/lib/multiTenantSupabase';

export async function GET(request: Request) {
  try {
    console.log('Leads API called');
    
    const authHeader = request.headers.get('Authorization');
    const businessId = request.headers.get('x-business-id');
    
    console.log('Headers:', { 
      authHeader: authHeader ? 'Present' : 'Missing', 
      businessId: businessId || 'Missing' 
    });

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

    // Get user session using the token from Authorization header
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    console.log('Auth result:', { user: user?.id, error: authError?.message });
    
    if (authError || !user) {
      console.error('Auth error:', authError);
      return NextResponse.json({ error: 'Unauthorized', details: authError?.message }, { status: 401 });
    }

    // Get business context from headers
    if (!businessId) {
      return NextResponse.json({ error: 'Business context required' }, { status: 400 });
    }

    // Verify user has access to this business (MVP: simple ownership check)
    console.log('Checking business access for user:', user.id, 'business:', businessId);
    const { data: businessAccess, error: accessError } = await supabase
      .from('businesses')
      .select('id')
      .eq('owner_id', user.id)
      .eq('id', businessId)
      .single();

    console.log('Business access result:', { data: businessAccess, error: accessError?.message });

    if (accessError || !businessAccess) {
      console.error('Access denied:', accessError);
      return NextResponse.json({ error: 'Access denied to this business', details: accessError?.message }, { status: 403 });
    }

    // Set business context and fetch leads
    MultiTenantHelper.setBusinessContext(businessId);
    
    console.log('Fetching leads for business:', businessId);
    const { data: leads, error: leadsError } = await supabase
      .from('leads')
      .select('*')
      .eq('business_id', businessId)
      .order('created_at', { ascending: false });

    console.log('Leads query result:', { count: leads?.length, error: leadsError?.message });

    if (leadsError) {
      // Check if the error is because the table doesn't exist
      if (leadsError.message && leadsError.message.includes('relation "leads" does not exist')) {
        return NextResponse.json({ 
          error: 'Leads table not found. Please run the database setup script.',
          code: 'TABLE_NOT_FOUND',
          details: 'Run the SQL script at /database/setup_database.sql in your Supabase SQL editor'
        }, { status: 500 });
      }
      return NextResponse.json({ error: leadsError.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      data: leads,
      business_id: businessId,
      user_id: user.id
    });

  } catch (error) {
    console.error('Leads API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  console.log('POST /api/leads called');
  
  try {
    const authHeader = request.headers.get('Authorization');
    const businessId = request.headers.get('x-business-id');
    const contentType = request.headers.get('Content-Type');
    
    console.log('Request headers:', { 
      authHeader: authHeader ? 'Present' : 'Missing', 
      businessId: businessId || 'Missing',
      contentType: contentType || 'Missing'
    });

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

    // Get user session using the token from Authorization header
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    console.log('Auth result:', { user: user?.id, error: authError?.message });
    
    if (authError || !user) {
      console.error('Auth error:', authError);
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get business context from headers
    if (!businessId) {
      console.error('Business ID missing');
      return NextResponse.json({ error: 'Business context required' }, { status: 400 });
    }

    // Verify user has permission to create leads (MVP: simple ownership check)
    const { data: businessAccess, error: accessError } = await supabase
      .from('businesses')
      .select('id, owner_id')
      .eq('owner_id', user.id)
      .eq('id', businessId)
      .single();

    console.log('Business access result:', { data: businessAccess, error: accessError?.message });

    if (accessError || !businessAccess) {
      console.error('Access denied:', accessError);
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    // Parse request body
    const leadData = await request.json();
    console.log('Lead data received:', leadData);

    // Set business context and create lead
    MultiTenantHelper.setBusinessContext(businessId);
    
    const { data: lead, error: leadError } = await supabase
      .from('leads')
      .insert({
        ...leadData,
        business_id: businessId
      })
      .select()
      .single();

    console.log('Lead creation result:', { data: lead, error: leadError?.message });

    if (leadError) {
      console.error('Lead creation error:', leadError);
      return NextResponse.json({ 
        error: leadError.message, 
        details: leadError.details,
        code: leadError.code 
      }, { status: 500 });
    }

    console.log('Lead created successfully:', lead);
    return NextResponse.json({
      success: true,
      data: lead,
      message: 'Lead created successfully'
    });

  } catch (error) {
    console.error('Create lead API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
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

    // Get business context from headers
    const businessId = request.headers.get('x-business-id');
    if (!businessId) {
      return NextResponse.json({ error: 'Business context required' }, { status: 400 });
    }

    // Verify user has permission to update leads (MVP: simple ownership check)
    const { data: businessAccess, error: accessError } = await supabase
      .from('businesses')
      .select('id, owner_id')
      .eq('owner_id', user.id)
      .eq('id', businessId)
      .single();

    if (accessError || !businessAccess) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    // Parse request body
    const { id, ...updateData } = await request.json();

    if (!id) {
      return NextResponse.json({ error: 'Lead ID is required' }, { status: 400 });
    }

    // Set business context and update lead
    MultiTenantHelper.setBusinessContext(businessId);
    
    const { data: lead, error: leadError } = await supabase
      .from('leads')
      .update(updateData)
      .eq('id', id)
      .eq('business_id', businessId)
      .select()
      .single();

    if (leadError) {
      return NextResponse.json({ error: leadError.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      data: lead,
      message: 'Lead updated successfully'
    });

  } catch (error) {
    console.error('Update lead API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
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

    // Get business context from headers
    const businessId = request.headers.get('x-business-id');
    if (!businessId) {
      return NextResponse.json({ error: 'Business context required' }, { status: 400 });
    }

    // Verify user has permission to delete leads (MVP: simple ownership check)
    const { data: businessAccess, error: accessError } = await supabase
      .from('businesses')
      .select('id, owner_id')
      .eq('owner_id', user.id)
      .eq('id', businessId)
      .single();

    if (accessError || !businessAccess) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    // Parse request body
    const { id } = await request.json();

    if (!id) {
      return NextResponse.json({ error: 'Lead ID is required' }, { status: 400 });
    }

    // Set business context and delete lead
    MultiTenantHelper.setBusinessContext(businessId);
    
    const { error: leadError } = await supabase
      .from('leads')
      .delete()
      .eq('id', id)
      .eq('business_id', businessId);

    if (leadError) {
      return NextResponse.json({ error: leadError.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'Lead deleted successfully'
    });

  } catch (error) {
    console.error('Delete lead API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
