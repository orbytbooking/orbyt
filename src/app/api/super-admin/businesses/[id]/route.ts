import { NextRequest, NextResponse } from 'next/server';
import { requireSuperAdminGate } from '@/lib/auth-helpers';
import { getPlatformBillingProvider } from '@/lib/platform-billing/platformBillingProvider';

export const dynamic = 'force-dynamic';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const gate = await requireSuperAdminGate();
  if (!gate.ok) return gate.response;

  const { admin } = gate;

  const { id: businessId } = await params;
  if (!businessId) {
    return NextResponse.json({ error: 'Business ID required' }, { status: 400 });
  }

  try {
    const { data: business, error: bizError } = await admin
      .from('businesses')
      .select('id, name, address, category, plan, owner_id, created_at, updated_at, is_active, business_email, business_phone, city, zip_code, website, description, logo_url, subdomain, domain')
      .eq('id', businessId)
      .maybeSingle();

    if (bizError || !business) {
      return NextResponse.json({ error: 'Business not found' }, { status: 404 });
    }

    const ownerId = business.owner_id as string | null;
    let ownerName = '';
    let ownerEmail = '';

    if (ownerId) {
      const { data: profile } = await admin
        .from('profiles')
        .select('full_name')
        .eq('id', ownerId)
        .maybeSingle();
      ownerName = (profile?.full_name as string) ?? '';

      try {
        const { data: authUser } = await admin.auth.admin.getUserById(ownerId);
        ownerEmail = authUser?.user?.email ?? '';
      } catch (_) {
        // non-fatal
      }
    }

    const [
      { count: bookingsCount },
      { count: providersCount },
      { count: customersCount },
      { count: teamProfilesCount },
    ] = await Promise.all([
      admin.from('bookings').select('id', { count: 'exact', head: true }).eq('business_id', businessId),
      admin.from('service_providers').select('id', { count: 'exact', head: true }).eq('business_id', businessId),
      admin.from('customers').select('id', { count: 'exact', head: true }).eq('business_id', businessId),
      admin.from('profiles').select('id', { count: 'exact', head: true }).eq('business_id', businessId),
    ]);

    let storageUsedBytes = 0;
    try {
      const { data: driveFiles } = await admin
        .from('provider_drive_files')
        .select('size_bytes')
        .eq('business_id', businessId)
        .eq('type', 'file');
      storageUsedBytes = (driveFiles ?? []).reduce((sum: number, row: { size_bytes?: number | null }) => sum + Number(row.size_bytes ?? 0), 0);
    } catch (_) {
      // Non-fatal
    }

    const { data: revenueRows } = await admin
      .from('bookings')
      .select('total_price, status')
      .eq('business_id', businessId);
    const totalRevenue = (revenueRows ?? [])
      .filter((b: { status: string }) => b.status !== 'cancelled')
      .reduce((sum: number, b: { total_price?: number }) => sum + Number(b.total_price ?? 0), 0);

    const { data: recentBookings } = await admin
      .from('bookings')
      .select('id, service, scheduled_date, scheduled_time, status, total_price, customer_name, created_at')
      .eq('business_id', businessId)
      .order('created_at', { ascending: false })
      .limit(10);

    // Subscription & billing (platform_subscriptions, platform_subscription_plans, platform_payments)
    let subscription: {
      planName: string;
      planSlug: string;
      status: string;
      amountCents: number;
      currentPeriodStart?: string;
      currentPeriodEnd?: string;
      stripeCustomerId?: string | null;
      stripeSubscriptionId?: string | null;
      authorizeNetCustomerProfileId?: string | null;
      authorizeNetPaymentProfileId?: string | null;
      authorizeNetSubscriptionId?: string | null;
    } | null = null;
    let recentSubscriptionPayments: { paid_at: string; amount_cents: number; description?: string }[] = [];
    let paymentIssueCounts = { failed: 0, refunded: 0, pending: 0 };
    let recentPlatformPayments:
      | {
          id?: string;
          paid_at: string;
          amount_cents: number;
          description?: string;
          status: string;
          plan_slug?: string | null;
        }[]
      | [] = [];
    try {
      const { data: subRow } = await admin
        .from('platform_subscriptions')
        .select(
          'id, plan_id, status, current_period_start, current_period_end, stripe_customer_id, stripe_subscription_id, authorize_net_customer_profile_id, authorize_net_payment_profile_id, authorize_net_subscription_id'
        )
        .eq('business_id', businessId)
        .maybeSingle();
      if (subRow) {
        const planId = (subRow as { plan_id: string }).plan_id;
        const { data: planRow } = await admin
          .from('platform_subscription_plans')
          .select('name, slug, amount_cents')
          .eq('id', planId)
          .maybeSingle();
        const plan = planRow as { name: string; slug: string; amount_cents: number } | null;
        subscription = {
          planName: plan?.name ?? (business.plan as string) ?? 'Starter',
          planSlug: plan?.slug ?? 'starter',
          status: (subRow as { status: string }).status ?? 'active',
          amountCents: plan?.amount_cents ?? 0,
          currentPeriodStart: (subRow as { current_period_start?: string }).current_period_start ?? undefined,
          currentPeriodEnd: (subRow as { current_period_end?: string }).current_period_end ?? undefined,
          stripeCustomerId: (subRow as { stripe_customer_id?: string | null }).stripe_customer_id ?? null,
          stripeSubscriptionId: (subRow as { stripe_subscription_id?: string | null }).stripe_subscription_id ?? null,
          authorizeNetCustomerProfileId:
            (subRow as { authorize_net_customer_profile_id?: string | null }).authorize_net_customer_profile_id ??
            null,
          authorizeNetPaymentProfileId:
            (subRow as { authorize_net_payment_profile_id?: string | null }).authorize_net_payment_profile_id ?? null,
          authorizeNetSubscriptionId:
            (subRow as { authorize_net_subscription_id?: string | null }).authorize_net_subscription_id ?? null,
        };
      }
      const { data: paymentRows } = await admin
        .from('platform_payments')
        .select('paid_at, amount_cents, description')
        .eq('business_id', businessId)
        .eq('status', 'paid')
        .order('paid_at', { ascending: false })
        .limit(5);
      recentSubscriptionPayments = (paymentRows ?? []).map((p: { paid_at: string; amount_cents: number; description?: string }) => ({
        paid_at: p.paid_at,
        amount_cents: p.amount_cents,
        description: p.description,
      }));

      // Payment health + recent billing events (includes failed / pending / refunded)
      const { data: paymentEventRows } = await admin
        .from('platform_payments')
        .select('id, paid_at, amount_cents, description, status, plan_slug')
        .eq('business_id', businessId)
        .order('paid_at', { ascending: false })
        .limit(10);

      const events = (paymentEventRows ?? []) as {
        id?: string;
        paid_at: string;
        amount_cents: number;
        description?: string;
        status: string;
        plan_slug?: string | null;
      }[];

      recentPlatformPayments = events.map((p) => ({
        id: p.id,
        paid_at: p.paid_at,
        amount_cents: p.amount_cents,
        description: p.description,
        status: p.status,
        plan_slug: p.plan_slug ?? null,
      }));

      paymentIssueCounts = events.reduce(
        (acc, row) => {
          if (row.status === 'failed') acc.failed += 1;
          if (row.status === 'pending') acc.pending += 1;
          if (row.status === 'refunded') acc.refunded += 1;
          return acc;
        },
        { failed: 0, refunded: 0, pending: 0 }
      );
    } catch (_) {
      // Non-fatal: subscription tables may not exist
    }

    const planSlugForStorage = (subscription?.planSlug ?? (business.plan as string) ?? 'starter').toString().toLowerCase();
    const STORAGE_LIMIT_BYTES: Record<string, number> = {
      starter: 1 * 1024 * 1024 * 1024,
      growth: 10 * 1024 * 1024 * 1024,
      premium: 100 * 1024 * 1024 * 1024,
      // legacy slugs
      pro: 10 * 1024 * 1024 * 1024,
      enterprise: 100 * 1024 * 1024 * 1024,
    };
    const storageLimitBytes = STORAGE_LIMIT_BYTES[planSlugForStorage] ?? STORAGE_LIMIT_BYTES.starter;

    return NextResponse.json({
      platformBillingProvider: getPlatformBillingProvider(),
      business: {
        ...business,
        owner_name: ownerName,
        owner_email: ownerEmail,
      },
      counts: {
        bookings: bookingsCount ?? 0,
        providers: providersCount ?? 0,
        customers: customersCount ?? 0,
        /** Profiles linked to this business (team / app users). */
        team_profiles: teamProfilesCount ?? 0,
      },
      storageUsedBytes,
      storageLimitBytes,
      totalRevenue: Math.round(totalRevenue * 100) / 100,
      recentBookings: recentBookings ?? [],
      subscription: subscription ?? undefined,
      recentSubscriptionPayments,
      paymentIssueCounts,
      recentPlatformPayments,
    });
  } catch (err) {
    console.error('Super admin business detail error:', err);
    return NextResponse.json({ error: 'Failed to load business' }, { status: 500 });
  }
}

/** Update business (edit, suspend/activate, assign plan). */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const gate = await requireSuperAdminGate();
  if (!gate.ok) return gate.response;

  const { admin } = gate;

  const { id: businessId } = await params;
  if (!businessId) {
    return NextResponse.json({ error: 'Business ID required' }, { status: 400 });
  }

  try {
    const body = await request.json();
    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };

    if (body.name !== undefined) updates.name = body.name;
    if (body.plan !== undefined) updates.plan = body.plan;
    if (body.is_active !== undefined) updates.is_active = body.is_active;
    if (body.business_email !== undefined) updates.business_email = body.business_email;
    if (body.business_phone !== undefined) updates.business_phone = body.business_phone;
    if (body.address !== undefined) updates.address = body.address;
    if (body.city !== undefined) updates.city = body.city;
    if (body.zip_code !== undefined) updates.zip_code = body.zip_code;
    if (body.website !== undefined) updates.website = body.website;
    if (body.description !== undefined) updates.description = body.description;
    if (body.category !== undefined) updates.category = body.category;
    if (body.subdomain !== undefined) updates.subdomain = body.subdomain || null;
    if (body.domain !== undefined) updates.domain = body.domain || null;

    const { error: updateError } = await admin
      .from('businesses')
      .update(updates)
      .eq('id', businessId);

    if (updateError) {
      console.error('Super admin PATCH business:', updateError);
      return NextResponse.json({ error: updateError.message }, { status: 400 });
    }

    if (body.plan !== undefined) {
      const planSlug = (body.plan || 'starter').toString().toLowerCase().trim();
      const { data: planRow } = await admin
        .from('platform_subscription_plans')
        .select('id')
        .eq('slug', planSlug)
        .maybeSingle();
      if (planRow) {
        await admin
          .from('platform_subscriptions')
          .update({ plan_id: (planRow as { id: string }).id, updated_at: new Date().toISOString() })
          .eq('business_id', businessId);
      }
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Super admin PATCH business error:', err);
    return NextResponse.json({ error: 'Failed to update business' }, { status: 500 });
  }
}

/** Delete business (hard delete). Use with caution. */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const gate = await requireSuperAdminGate();
  if (!gate.ok) return gate.response;

  const { admin } = gate;

  const { id: businessId } = await params;
  if (!businessId) {
    return NextResponse.json({ error: 'Business ID required' }, { status: 400 });
  }

  try {
    const { error } = await admin.from('businesses').delete().eq('id', businessId);
    if (error) {
      console.error('Super admin DELETE business:', error);
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Super admin DELETE business error:', err);
    return NextResponse.json({ error: 'Failed to delete business' }, { status: 500 });
  }
}
