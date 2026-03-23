import { NextRequest, NextResponse } from 'next/server';
import { getSuperAdminUser, getAuthenticatedUser, createServiceRoleClient, createUnauthorizedResponse, createForbiddenResponse } from '@/lib/auth-helpers';

export const dynamic = 'force-dynamic';

/**
 * Log in as the tenant's owner without using their credentials.
 * Uses admin generateLink + verifyOtp to get a session server-side, then returns tokens
 * so the client can setSession and redirect to /admin. No magic link or redirect needed.
 */
export async function POST(request: NextRequest) {
  const user = await getSuperAdminUser();
  if (!user) {
    const authUser = await getAuthenticatedUser();
    if (!authUser) return createUnauthorizedResponse();
    return createForbiddenResponse('Not a super admin');
  }

  const admin = createServiceRoleClient();
  if (!admin) {
    return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
  }

  try {
    const body = await request.json();
    const businessId = body.businessId ?? body.business_id;
    if (!businessId) {
      return NextResponse.json({ error: 'businessId is required' }, { status: 400 });
    }

    const { data: business, error: bizError } = await admin
      .from('businesses')
      .select('id, name, owner_id')
      .eq('id', businessId)
      .maybeSingle();

    if (bizError || !business) {
      return NextResponse.json({ error: 'Business not found' }, { status: 404 });
    }

    const ownerId = (business as { owner_id: string | null }).owner_id;
    if (!ownerId) {
      return NextResponse.json({ error: 'Business has no owner to impersonate' }, { status: 400 });
    }

    const { data: authUser, error: userError } = await admin.auth.admin.getUserById(ownerId);
    if (userError || !authUser?.user?.email) {
      return NextResponse.json({ error: 'Owner user not found' }, { status: 404 });
    }

    const { data: linkData, error: linkError } = await admin.auth.admin.generateLink({
      type: 'magiclink',
      email: authUser.user.email,
    });

    const props = linkData?.properties as { hashed_token?: string; action_link?: string } | undefined;
    const hashedToken = props?.hashed_token;
    if (linkError || !hashedToken) {
      console.error('Impersonate generateLink:', linkError);
      return NextResponse.json({ error: 'Failed to generate session' }, { status: 500 });
    }

    const { data: verifyData, error: verifyError } = await admin.auth.verifyOtp({
      token_hash: hashedToken,
      type: 'email',
    });

    if (verifyError || !verifyData?.session) {
      console.error('Impersonate verifyOtp:', verifyError);
      return NextResponse.json({ error: 'Failed to create session for tenant' }, { status: 500 });
    }

    const { access_token, refresh_token } = verifyData.session;
    return NextResponse.json({
      access_token,
      refresh_token,
      message: 'You are now logged in as this tenant.',
    });
  } catch (err) {
    console.error('Super admin impersonate error:', err);
    return NextResponse.json({ error: 'Failed to impersonate tenant' }, { status: 500 });
  }
}
