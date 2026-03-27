import { NextResponse } from 'next/server';
import { getAuthenticatedSuperAdminUser, createServiceRoleClient, createUnauthorizedResponse, createForbiddenResponse } from '@/lib/auth-helpers';

export const dynamic = 'force-dynamic';

/** Verify the current session belongs to a super admin. Returns user info if yes. */
export async function GET() {
  const user = await getAuthenticatedSuperAdminUser();
  if (!user) {
    return createUnauthorizedResponse();
  }

  const admin = createServiceRoleClient();
  if (!admin) {
    return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
  }

  const { data, error } = await admin
    .from('super_admins')
    .select('user_id')
    .eq('user_id', user.id)
    .maybeSingle();

  if (error || !data) {
    return createForbiddenResponse('Not a super admin');
  }

  return NextResponse.json({
    user: {
      id: user.id,
      email: user.email ?? undefined,
      user_metadata: user.user_metadata,
    },
  });
}
