import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    console.log('=== FIX PROVIDER USER IDs API ===');
    
    // Create admin client
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    // Get providers with NULL user_id
    const { data: providersWithNullUserId, error: fetchError } = await supabase
      .from('service_providers')
      .select('id, first_name, last_name, email, business_id')
      .is('user_id', null);

    if (fetchError) {
      console.error('Error fetching providers:', fetchError);
      return NextResponse.json(
        { error: 'Failed to fetch providers', details: fetchError.message },
        { status: 500 }
      );
    }

    console.log(`Found ${providersWithNullUserId?.length || 0} providers with NULL user_id`);

    if (!providersWithNullUserId || providersWithNullUserId.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'All providers already have correct user_id',
        fixedCount: 0,
        providers: []
      });
    }

    const fixedProviders = [];
    const failedProviders = [];

    // Fix each provider
    for (const provider of providersWithNullUserId) {
      try {
        // Find corresponding auth user
        const { data: authData, error: authError } = await supabase.auth.admin.listUsers();
        
        if (authError) {
          console.error('Error fetching auth users:', authError);
          failedProviders.push({
            providerId: provider.id,
            email: provider.email,
            error: 'Failed to fetch auth users'
          });
          continue;
        }

        const users = authData.users || [];
        const matchingUser = users.find((user: any) => 
          user.email === provider.email && 
          user.user_metadata?.role === 'provider'
        );

        if (!matchingUser) {
          console.error(`No auth user found for provider: ${provider.email}`);
          failedProviders.push({
            providerId: provider.id,
            email: provider.email,
            error: 'No matching auth user found'
          });
          continue;
        }

        // Update provider with correct user_id
        const { error: updateError } = await supabase
          .from('service_providers')
          .update({ 
            user_id: matchingUser.id,
            updated_at: new Date().toISOString()
          })
          .eq('id', provider.id);

        if (updateError) {
          console.error(`Error updating provider ${provider.id}:`, updateError);
          failedProviders.push({
            providerId: provider.id,
            email: provider.email,
            error: updateError.message
          });
          continue;
        }

        console.log(`✅ Fixed provider: ${provider.email} -> user_id: ${matchingUser.id}`);
        fixedProviders.push({
          providerId: provider.id,
          email: provider.email,
          name: `${provider.first_name} ${provider.last_name}`,
          userId: matchingUser.id
        });

      } catch (error: any) {
        console.error(`Error fixing provider ${provider.id}:`, error);
        failedProviders.push({
          providerId: provider.id,
          email: provider.email,
          error: error.message
        });
      }
    }

    return NextResponse.json({
      success: true,
      message: `Fixed ${fixedProviders.length} provider user IDs`,
      fixedCount: fixedProviders.length,
      failedCount: failedProviders.length,
      fixedProviders,
      failedProviders
    });

  } catch (error: any) {
    console.error('Fix provider user IDs error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}
