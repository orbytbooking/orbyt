import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import {
  getAuthenticatedUser,
  createUnauthorizedResponse,
  createForbiddenResponse,
} from '@/lib/auth-helpers';

export const dynamic = 'force-dynamic';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

/**
 * Admin (business owner): log in as this provider without their password.
 * Same pattern as super-admin impersonate — generateLink + verifyOtp → session tokens.
 * Client must call setSession on the *provider* Supabase client (separate storage from admin).
 */
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) return createUnauthorizedResponse();

    const role = user.user_metadata?.role as string | undefined;
    if (role === 'customer') {
      return createForbiddenResponse('Customers cannot impersonate providers');
    }

    const { id: providerId } = await params;
    if (!providerId) {
      return NextResponse.json({ error: 'Provider ID is required' }, { status: 400 });
    }

    const admin = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: business, error: bizError } = await admin
      .from('businesses')
      .select('id')
      .eq('owner_id', user.id)
      .maybeSingle();

    if (bizError || !business) {
      return NextResponse.json({ error: 'Business not found for this account' }, { status: 404 });
    }

    const { data: provider, error: provError } = await admin
      .from('service_providers')
      .select('id, business_id, user_id, first_name, last_name')
      .eq('id', providerId)
      .maybeSingle();

    if (provError || !provider) {
      return NextResponse.json({ error: 'Provider not found' }, { status: 404 });
    }

    if (provider.business_id !== business.id) {
      return createForbiddenResponse('This provider does not belong to your business');
    }

    const userId = provider.user_id as string | null;
    if (!userId) {
      return NextResponse.json(
        {
          error:
            'This provider has no portal login yet. Open their profile and create a login account first.',
        },
        { status: 400 }
      );
    }

    const { data: authUser, error: userError } = await admin.auth.admin.getUserById(userId);
    if (userError || !authUser?.user?.email) {
      return NextResponse.json({ error: 'Provider login account not found' }, { status: 404 });
    }

    const metaRole = authUser.user.user_metadata?.role;
    if (metaRole != null && metaRole !== 'provider') {
      return NextResponse.json(
        { error: 'Linked account is not a provider user; cannot open provider portal as this account' },
        { status: 400 }
      );
    }

    const { data: linkData, error: linkError } = await admin.auth.admin.generateLink({
      type: 'magiclink',
      email: authUser.user.email,
    });

    const props = linkData?.properties as { hashed_token?: string } | undefined;
    const hashedToken = props?.hashed_token;
    if (linkError || !hashedToken) {
      console.error('Provider impersonate generateLink:', linkError);
      return NextResponse.json({ error: 'Failed to generate session' }, { status: 500 });
    }

    const { data: verifyData, error: verifyError } = await admin.auth.verifyOtp({
      token_hash: hashedToken,
      type: 'email',
    });

    if (verifyError || !verifyData?.session) {
      console.error('Provider impersonate verifyOtp:', verifyError);
      return NextResponse.json({ error: 'Failed to create provider session' }, { status: 500 });
    }

    const { access_token, refresh_token } = verifyData.session;
    return NextResponse.json({
      access_token,
      refresh_token,
      message: `Signed in as ${provider.first_name ?? ''} ${provider.last_name ?? ''}`.trim(),
    });
  } catch (e) {
    console.error('Provider impersonate error:', e);
    return NextResponse.json({ error: 'Failed to impersonate provider' }, { status: 500 });
  }
}
