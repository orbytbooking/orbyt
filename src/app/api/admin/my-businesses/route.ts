import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { getAuthenticatedUser, createUnauthorizedResponse, createForbiddenResponse } from '@/lib/auth-helpers';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

type UiRole = 'owner' | 'admin' | 'member';

function tenantRoleToUiRole(tenantRole: string | null | undefined): Exclude<UiRole, 'owner'> {
  const r = (tenantRole ?? '').toLowerCase();
  if (r === 'admin' || r === 'manager') return 'admin';
  return 'member';
}

/**
 * All businesses the signed-in user may open in the admin CRM: owned + tenant_users.
 */
export async function GET() {
  try {
    const user = await getAuthenticatedUser();
    if (!user) return createUnauthorizedResponse();

    const metaRole = user.user_metadata?.role || 'owner';
    if (metaRole === 'customer') {
      return createForbiddenResponse('Customers cannot access admin endpoints');
    }

    const userId = user.id;

    const { data: ownedRows, error: ownedErr } = await supabase
      .from('businesses')
      .select('*')
      .eq('owner_id', userId)
      .order('created_at', { ascending: false });

    if (ownedErr) {
      console.error('my-businesses owned:', ownedErr);
      return NextResponse.json({ error: 'Failed to load businesses' }, { status: 500 });
    }

    const { data: tenantRows, error: tenantErr } = await supabase
      .from('tenant_users')
      .select('business_id, role, permissions')
      .eq('user_id', userId)
      .eq('is_active', true);

    if (tenantErr) {
      console.warn('my-businesses tenant_users (table may be missing):', tenantErr.message);
    }

    const owned = ownedRows ?? [];
    const ownedIds = new Set(owned.map((b) => b.id));
    const tenantLinks = tenantRows ?? [];
    const tenantOnlyIds = [
      ...new Set(
        tenantLinks.map((t) => t.business_id as string).filter((id) => id && !ownedIds.has(id))
      ),
    ];

    let tenantBusinessRows: typeof owned = [];
    if (tenantOnlyIds.length > 0) {
      const { data: extra, error: extraErr } = await supabase
        .from('businesses')
        .select('*')
        .in('id', tenantOnlyIds);
      if (extraErr) {
        console.error('my-businesses tenant businesses:', extraErr);
      } else {
        tenantBusinessRows = extra ?? [];
      }
    }

    const businesses = [
      ...owned.map((b) => ({
        ...b,
        plan: b.plan || 'starter',
        created_at: b.created_at || new Date().toISOString(),
        updated_at: b.updated_at || new Date().toISOString(),
        is_active: (b as { is_active?: boolean | null }).is_active === true,
        role: 'owner' as const,
        module_permissions: null as Record<string, boolean> | null,
      })),
      ...tenantBusinessRows.map((b) => {
        const link = tenantLinks.find((t) => t.business_id === b.id);
        const rawPerm = (link as { permissions?: unknown } | undefined)?.permissions;
        const module_permissions =
          rawPerm != null && typeof rawPerm === 'object' && !Array.isArray(rawPerm)
            ? (rawPerm as Record<string, boolean>)
            : null;
        return {
          ...b,
          plan: b.plan || 'starter',
          created_at: b.created_at || new Date().toISOString(),
          updated_at: b.updated_at || new Date().toISOString(),
          is_active: (b as { is_active?: boolean | null }).is_active === true,
          role: tenantRoleToUiRole(link?.role as string | undefined),
          module_permissions,
        };
      }),
    ];

    return NextResponse.json({ businesses });
  } catch (e) {
    console.error('my-businesses GET:', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
