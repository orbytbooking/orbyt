import { NextRequest, NextResponse } from 'next/server';
import { requireSuperAdminGate } from '@/lib/auth-helpers';

export const dynamic = 'force-dynamic';

/** Create a new tenant (business). Body: { name, plan?, owner_email? }. */
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
    const ownerEmail = body.owner_email?.toString()?.trim();

    if (ownerEmail) {
      const { data: list } = await admin.auth.admin.listUsers({ page: 1, perPage: 1 });
      const all: { id: string; email?: string }[] = [];
      let page = 1;
      let hasMore = true;
      while (hasMore) {
        const { data } = await admin.auth.admin.listUsers({ page, per_page: 1000 });
        const users = data?.users ?? [];
        users.forEach((u: { id: string; email?: string }) => all.push(u));
        hasMore = users.length === 1000;
        page++;
      }
      const found = all.find((u) => u.email?.toLowerCase() === ownerEmail.toLowerCase());
      if (found) ownerId = found.id;
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

    return NextResponse.json({ success: true, business: newBusiness });
  } catch (err) {
    console.error('Super admin POST business error:', err);
    return NextResponse.json({ error: 'Failed to create business' }, { status: 500 });
  }
}
