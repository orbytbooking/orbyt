import type { SupabaseClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import { requireSuperAdminGate } from '@/lib/auth-helpers';

export const dynamic = 'force-dynamic';

const MIN_OWNER_PASSWORD_LEN = 8;

async function findUserIdByEmail(admin: SupabaseClient, email: string): Promise<string | null> {
  const target = email.trim().toLowerCase();
  let page = 1;
  const perPage = 1000;
  for (let i = 0; i < 50; i++) {
    const { data } = await admin.auth.admin.listUsers({ page, per_page: perPage });
    const u = data?.users?.find((x) => x.email?.toLowerCase() === target);
    if (u?.id) return u.id;
    const users = data?.users ?? [];
    if (users.length < perPage) break;
    page++;
  }
  return null;
}

/**
 * Create a new tenant (business).
 * Body: { name, plan?, owner_email?, owner_password?, owner_full_name? }
 * — With owner_email + owner_password, creates a new Auth user when needed or updates password for an existing user.
 * — With owner_email only, links an existing Auth user (no password change).
 */
export async function POST(request: NextRequest) {
  const gate = await requireSuperAdminGate();
  if (!gate.ok) return gate.response;

  const { admin } = gate;

  try {
    const body = await request.json();
    const name = body.name?.toString()?.trim();
    if (!name) {
      return NextResponse.json({ error: 'name is required' }, { status: 400 });
    }

    const planSlug = (body.plan || 'starter').toString().toLowerCase().trim();
    let ownerId: string | null = null;
    const ownerEmail = body.owner_email?.toString()?.trim() ?? '';
    const ownerPasswordRaw = body.owner_password?.toString() ?? '';
    const ownerPassword = ownerPasswordRaw.trim();
    const ownerFullName = body.owner_full_name?.toString()?.trim() ?? '';

    if (ownerPassword && !ownerEmail) {
      return NextResponse.json({ error: 'owner_email is required when owner_password is set' }, { status: 400 });
    }

    if (ownerEmail) {
      ownerId = await findUserIdByEmail(admin, ownerEmail);

      if (!ownerId) {
        if (ownerPassword.length < MIN_OWNER_PASSWORD_LEN) {
          return NextResponse.json(
            {
              error: `New owner accounts require a password of at least ${MIN_OWNER_PASSWORD_LEN} characters`,
            },
            { status: 400 }
          );
        }
        const { data: created, error: createErr } = await admin.auth.admin.createUser({
          email: ownerEmail,
          password: ownerPassword,
          email_confirm: true,
        });

        if (createErr) {
          const msg = createErr.message?.toLowerCase() ?? '';
          if (msg.includes('already') || msg.includes('registered') || msg.includes('exists')) {
            ownerId = await findUserIdByEmail(admin, ownerEmail);
            if (!ownerId) {
              return NextResponse.json({ error: createErr.message }, { status: 400 });
            }
            const { error: pwErr } = await admin.auth.admin.updateUserById(ownerId, { password: ownerPassword });
            if (pwErr) {
              return NextResponse.json({ error: pwErr.message }, { status: 400 });
            }
          } else {
            return NextResponse.json({ error: createErr.message }, { status: 400 });
          }
        } else if (created?.user?.id) {
          ownerId = created.user.id;
        }
      } else if (ownerPassword.length > 0) {
        if (ownerPassword.length < MIN_OWNER_PASSWORD_LEN) {
          return NextResponse.json(
            { error: `Password must be at least ${MIN_OWNER_PASSWORD_LEN} characters` },
            { status: 400 }
          );
        }
        const { error: pwErr } = await admin.auth.admin.updateUserById(ownerId, { password: ownerPassword });
        if (pwErr) {
          return NextResponse.json({ error: pwErr.message }, { status: 400 });
        }
      }
    }

    if (ownerEmail && !ownerId) {
      return NextResponse.json({ error: 'Could not create or link owner account' }, { status: 500 });
    }

    const { data: newBusiness, error: insertError } = await admin
      .from('businesses')
      .insert({
        name,
        plan: planSlug,
        owner_id: ownerId,
        is_active: true,
      })
      .select('id, name, plan, owner_id, created_at')
      .single();

    if (insertError) {
      console.error('Super admin POST business:', insertError);
      return NextResponse.json({ error: insertError.message }, { status: 400 });
    }

    const bid = (newBusiness as { id: string }).id;
    const { data: planRow } = await admin
      .from('platform_subscription_plans')
      .select('id')
      .eq('slug', planSlug)
      .maybeSingle();
    if (planRow) {
      const now = new Date();
      const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);
      await admin.from('platform_subscriptions').insert({
        business_id: bid,
        plan_id: (planRow as { id: string }).id,
        status: 'active',
        current_period_start: periodStart.toISOString().slice(0, 10),
        current_period_end: periodEnd.toISOString().slice(0, 10),
      }).then(() => {}).catch(() => {});
    }

    if (ownerId) {
      const displayName =
        ownerFullName ||
        (ownerEmail ? ownerEmail.split('@')[0] : '') ||
        'Owner';
      const { data: existingAuth } = await admin.auth.admin.getUserById(ownerId);
      const prevMeta = (existingAuth?.user?.user_metadata ?? {}) as Record<string, unknown>;
      await admin.auth.admin.updateUserById(ownerId, {
        user_metadata: {
          ...prevMeta,
          role: 'owner',
          business_id: bid,
          full_name: displayName,
        },
      });

      const { error: profErr } = await admin.from('profiles').upsert(
        {
          id: ownerId,
          full_name: displayName,
          phone: '',
          role: 'owner',
          business_id: bid,
          is_active: true,
        },
        { onConflict: 'id' }
      );
      if (profErr) {
        console.warn('Super admin POST business profile upsert:', profErr);
      }
    }

    return NextResponse.json({ success: true, business: newBusiness });
  } catch (err) {
    console.error('Super admin POST business error:', err);
    return NextResponse.json({ error: 'Failed to create business' }, { status: 500 });
  }
}
