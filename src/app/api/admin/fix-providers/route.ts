import { NextRequest, NextResponse } from 'next/server';
import {
  requireAdminTenantContext,
} from '@/lib/adminTenantContext';
import { blockInProduction } from '@/lib/devRouteGuard';

export async function POST(request: NextRequest) {
  try {
    const blocked = blockInProduction(request);
    if (blocked) return blocked;

    const ctx = await requireAdminTenantContext(request);
    if (ctx instanceof NextResponse) return ctx;
    const { supabase, businessId } = ctx;

    console.log('=== FIX PROVIDER USER IDs API ===');

    const { data: providersWithNullUserId, error: fetchError } = await supabase
      .from('service_providers')
      .select('id, first_name, last_name, email, business_id')
      .eq('business_id', businessId)
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

    for (const provider of providersWithNullUserId) {
      try {
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
        const matchingUser = users.find((user) =>
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

        const { error: updateError } = await supabase
          .from('service_providers')
          .update({
            user_id: matchingUser.id,
            updated_at: new Date().toISOString()
          })
          .eq('id', provider.id)
          .eq('business_id', businessId);

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

      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        console.error(`Error fixing provider ${provider.id}:`, error);
        failedProviders.push({
          providerId: provider.id,
          email: provider.email,
          error: message
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

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Fix provider user IDs error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: message },
      { status: 500 }
    );
  }
}
