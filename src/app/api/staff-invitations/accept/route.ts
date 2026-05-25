import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

const PROVIDER_EMAIL_STAFF_CONFLICT =
  'This email is already used for a service provider login for this business. Staff CRM access must use a different email. Provider and admin/staff sign-in are separate accounts.';

function serviceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Missing Supabase config');
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

type CrmRole = 'admin' | 'manager' | 'staff';

function normalizeRole(r: unknown): CrmRole {
  const s = typeof r === 'string' ? r.toLowerCase().trim() : '';
  if (s === 'admin' || s === 'manager' || s === 'staff') return s;
  return 'staff';
}

async function emailUsedByProviderOnBusiness(
  supabase: ReturnType<typeof serviceClient>,
  businessId: string,
  emailLower: string
): Promise<boolean> {
  const { data: rows } = await supabase
    .from('service_providers')
    .select('email')
    .eq('business_id', businessId);
  const list = (rows as { email?: string }[] | null) ?? [];
  return list.some((p) => (p.email ?? '').trim().toLowerCase() === emailLower);
}

async function findAuthUserIdByEmail(
  supabase: ReturnType<typeof serviceClient>,
  email: string
): Promise<string | null> {
  const target = email.trim().toLowerCase();
  let page = 1;
  const perPage = 1000;
  for (let i = 0; i < 50; i++) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage });
    if (error) {
      console.error('listUsers page', page, error);
      return null;
    }
    const u = data?.users?.find((x) => x.email?.toLowerCase() === target);
    if (u?.id) return u.id;
    const users = data?.users ?? [];
    if (users.length < perPage) break;
    page++;
  }
  return null;
}

/** Link profile + tenant row + mark invitation accepted (idempotent). */
async function finalizeStaffAccess(
  supabase: ReturnType<typeof serviceClient>,
  params: {
    userId: string;
    invitationId: string;
    businessId: string;
    fullName: string;
    crmRole: CrmRole;
    phone: string | null;
    permissions?: unknown;
  }
): Promise<{ ok: true } | { ok: false; message: string; details?: string }> {
  const now = new Date().toISOString();

  const { error: profErr } = await supabase.from('profiles').upsert(
    {
      id: params.userId,
      full_name: params.fullName,
      role: params.crmRole,
      business_id: params.businessId,
      phone: params.phone,
      is_active: true,
      updated_at: now,
    },
    { onConflict: 'id' }
  );

  if (profErr) {
    console.warn('profiles upsert (staff accept):', profErr);
  }

  const { data: existingTenant } = await supabase
    .from('tenant_users')
    .select('id')
    .eq('business_id', params.businessId)
    .eq('user_id', params.userId)
    .maybeSingle();

  if (!existingTenant) {
    const perm =
      params.permissions != null &&
      typeof params.permissions === 'object' &&
      !Array.isArray(params.permissions)
        ? params.permissions
        : null;
    const { error: tenantErr } = await supabase.from('tenant_users').insert({
      business_id: params.businessId,
      user_id: params.userId,
      role: params.crmRole,
      is_active: true,
      ...(perm ? { permissions: perm } : {}),
    });

    if (tenantErr) {
      console.error('tenant_users insert:', tenantErr);
      return {
        ok: false,
        message:
          'Could not add team access. Run migration 098_tenant_users.sql (creates tenant_users) or fix your table columns.',
        details: tenantErr.message,
      };
    }
  }

  const { error: invUpdErr } = await supabase
    .from('staff_invitations')
    .update({ status: 'accepted', accepted_at: now, updated_at: now })
    .eq('id', params.invitationId)
    .eq('status', 'pending');

  if (invUpdErr) {
    console.error('staff_invitations update:', invUpdErr);
  }

  return { ok: true };
}

export async function POST(request: NextRequest) {
  try {
    const supabase = serviceClient();
    const body = await request.json();
    const invitationId = typeof body.invitationId === 'string' ? body.invitationId : '';
    const password = typeof body.password === 'string' ? body.password : '';
    const emailIn = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';

    if (!invitationId || !password || password.length < 8) {
      return NextResponse.json(
        { error: 'invitationId and password (min 8 characters) are required' },
        { status: 400 }
      );
    }

    const { data: invitation, error: invErr } = await supabase
      .from('staff_invitations')
      .select('id, business_id, staff_id, email, status, expires_at')
      .eq('id', invitationId)
      .single();

    if (invErr || !invitation) {
      return NextResponse.json({ error: 'Invitation not found' }, { status: 404 });
    }

    if (invitation.status !== 'pending') {
      // Idempotent: already finished — still OK if access rows exist
      const { data: st } = await supabase
        .from('staff')
        .select('user_id')
        .eq('id', invitation.staff_id)
        .single();
      if (st?.user_id) {
        return NextResponse.json({
          success: true,
          message: 'Account was already activated. You can sign in.',
        });
      }
      return NextResponse.json({ error: 'Invitation is no longer valid' }, { status: 410 });
    }

    if (new Date(invitation.expires_at) < new Date()) {
      return NextResponse.json({ error: 'Invitation has expired' }, { status: 410 });
    }

    const email = (invitation.email as string).trim().toLowerCase();
    if (emailIn && emailIn !== email) {
      return NextResponse.json({ error: 'Email does not match invitation' }, { status: 400 });
    }

    const businessId = invitation.business_id as string;
    if (await emailUsedByProviderOnBusiness(supabase, businessId, email)) {
      return NextResponse.json({ error: PROVIDER_EMAIL_STAFF_CONFLICT }, { status: 409 });
    }

    const { data: staff, error: staffErr } = await supabase
      .from('staff')
      .select('id, first_name, last_name, email, role, phone, user_id, business_id, permissions')
      .eq('id', invitation.staff_id)
      .single();

    if (staffErr || !staff) {
      return NextResponse.json({ error: 'Staff record not found' }, { status: 404 });
    }

    const crmRole = normalizeRole(staff.role);
    const fullName = `${staff.first_name} ${staff.last_name}`.trim();

    // Retry after partial success: auth + staff.user_id set but tenant_users failed
    if (staff.user_id) {
      const { data: linkedUser } = await supabase.auth.admin.getUserById(staff.user_id as string);
      if (linkedUser?.user?.user_metadata?.role === 'provider') {
        return NextResponse.json(
          {
            error:
              'This invite was tied to a provider login. Remove this staff entry in Settings → Staff and add them again with a different email (not their provider email).',
          },
          { status: 409 }
        );
      }

      const fin = await finalizeStaffAccess(supabase, {
        userId: staff.user_id as string,
        invitationId,
        businessId: invitation.business_id as string,
        fullName,
        crmRole,
        phone: (staff.phone as string | null) ?? null,
        permissions: (staff as { permissions?: unknown }).permissions,
      });
      if (!fin.ok) {
        return NextResponse.json({ error: fin.message, details: fin.details }, { status: 500 });
      }
      return NextResponse.json({
        success: true,
        message: 'Account ready — you can sign in to the admin dashboard.',
      });
    }

    let userId: string | null = null;

    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: fullName,
        role: crmRole,
        business_id: invitation.business_id,
        staff_id: staff.id,
      },
    });

    userId = authData?.user?.id ?? null;

    if (authError) {
      const msg = (authError.message || '').toLowerCase();
      if (msg.includes('already') || msg.includes('registered') || msg.includes('exists')) {
        userId = await findAuthUserIdByEmail(supabase, email);
        if (userId) {
          const { data: existingAuth, error: getUserErr } = await supabase.auth.admin.getUserById(userId);
          if (getUserErr) {
            console.error('getUserById:', getUserErr);
          }
          const existingRole = existingAuth?.user?.user_metadata?.role;
          if (existingRole === 'provider') {
            return NextResponse.json({ error: PROVIDER_EMAIL_STAFF_CONFLICT }, { status: 409 });
          }

          const { error: pwdErr } = await supabase.auth.admin.updateUserById(userId, {
            password,
            email_confirm: true,
            user_metadata: {
              full_name: fullName,
              role: crmRole,
              business_id: invitation.business_id,
              staff_id: staff.id,
            },
          });
          if (pwdErr) {
            console.error('updateUserById (existing user):', pwdErr);
            return NextResponse.json(
              { error: pwdErr.message || 'Could not update password for existing account' },
              { status: 400 }
            );
          }
        }
      }
      if (!userId) {
        return NextResponse.json(
          { error: authError.message || 'Failed to create login account' },
          { status: 400 }
        );
      }
    }

    if (!userId) {
      return NextResponse.json({ error: 'Auth user was not created' }, { status: 500 });
    }

    const now = new Date().toISOString();

    const { error: staffUpdErr } = await supabase
      .from('staff')
      .update({ user_id: userId, updated_at: now })
      .eq('id', staff.id);

    if (staffUpdErr) {
      console.error('staff user_id update:', staffUpdErr);
      return NextResponse.json(
        { error: 'Failed to link staff to login: ' + staffUpdErr.message },
        { status: 500 }
      );
    }

    const fin = await finalizeStaffAccess(supabase, {
      userId,
      invitationId,
      businessId: invitation.business_id as string,
      fullName,
      crmRole,
      phone: (staff.phone as string | null) ?? null,
      permissions: (staff as { permissions?: unknown }).permissions,
    });

    if (!fin.ok) {
      return NextResponse.json({ error: fin.message, details: fin.details }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'Account ready — you can sign in to the admin dashboard.',
    });
  } catch (e) {
    console.error('staff-invitations accept:', e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
