import { NextResponse } from 'next/server';
import { requireSuperAdminGate } from '@/lib/auth-helpers';
import { getPlatformBillingProvider } from '@/lib/platform-billing/platformBillingProvider';

export const dynamic = 'force-dynamic';

export async function GET() {
  const gate = await requireSuperAdminGate();
  if (!gate.ok) return gate.response;

  const { admin } = gate;

  const now = new Date();
  const thisMonthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const thisMonthEnd = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0));
  const lastMonthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1));

  try {
    // Businesses: id, name, owner_id, plan, is_active, created_at + owner name from profiles
    const { data: businessesRows, error: bizError } = await admin
      .from('businesses')
      .select(`
        id,
        name,
        owner_id,
        plan,
        is_active,
        created_at,
        business_email,
        stripe_connect_account_id
      `)
      .order('created_at', { ascending: false });

    if (bizError) {
      console.error('Super admin dashboard businesses error:', bizError);
      return NextResponse.json({ error: 'Failed to load businesses' }, { status: 500 });
    }

    const businesses = businessesRows ?? [];
    const ownerIds = [...new Set(businesses.map((b: { owner_id: string | null }) => b.owner_id).filter(Boolean))] as string[];

    // Owner names from profiles
    let ownerNameMap: Record<string, string> = {};
    if (ownerIds.length > 0) {
      const { data: profiles } = await admin
        .from('profiles')
        .select('id, full_name')
        .in('id', ownerIds);
      if (profiles) {
        ownerNameMap = Object.fromEntries(profiles.map((p: { id: string; full_name: string | null }) => [p.id, p.full_name ?? '']));
      }
    }

    // Owner emails from Auth (paginate if needed)
    const emailMap: Record<string, string> = {};
    try {
      const perPage = 1000;
      let page = 1;
      let hasMore = true;
      while (hasMore) {
        const { data: listData } = await admin.auth.admin.listUsers({ page, per_page: perPage });
        const users = listData?.users ?? [];
        users.forEach((u: { id: string; email?: string }) => {
          if (ownerIds.includes(u.id) && u.email) emailMap[u.id] = u.email;
        });
        hasMore = users.length === perPage;
        page++;
      }
    } catch (_) {
      // Non-fatal: we still have owner names
    }

    // Revenue and bookings: include business_id for per-business and per-plan aggregation
    const { data: revenueRows } = await admin
      .from('bookings')
      .select('id, business_id, total_price, status, payment_status, scheduled_date, created_at, service, customer_name');
    const allBookings = revenueRows ?? [];
    const totalRevenue = allBookings
      .filter((b: { status: string }) => b.status !== 'cancelled')
      .reduce((sum: number, b: { total_price?: number }) => sum + Number(b.total_price ?? 0), 0);
    const monthlyRevenue = allBookings
      .filter((b: { status: string; scheduled_date?: string; created_at?: string }) => {
        if (b.status === 'cancelled') return false;
        const d = b.scheduled_date ?? b.created_at;
        if (!d) return false;
        const date = new Date(d);
        return date >= thisMonthStart && date <= thisMonthEnd;
      })
      .reduce((sum: number, b: { total_price?: number }) => sum + Number(b.total_price ?? 0), 0);

    // Booking counts per business for "last active" and totals
    const { data: bookingCounts } = await admin
      .from('bookings')
      .select('business_id, created_at');
    const byBusiness = (bookingCounts ?? []).reduce((acc: Record<string, { count: number; last: string }>, b: { business_id: string; created_at?: string }) => {
      const id = b.business_id;
      if (!acc[id]) acc[id] = { count: 0, last: '' };
      acc[id].count += 1;
      if (b.created_at && (!acc[id].last || b.created_at > acc[id].last)) acc[id].last = b.created_at;
      return acc;
    }, {});

    const totalBusinesses = businesses.length;
    const activeBusinesses = businesses.filter((b: { is_active: boolean }) => b.is_active).length;
    const newBusinessesThisMonth = businesses.filter(
      (b: { created_at: string }) => new Date(b.created_at) >= thisMonthStart
    ).length;

    const totalBookings = allBookings.length;
    const bookingsThisMonth = allBookings.filter((b: { scheduled_date?: string; created_at?: string }) => {
      const d = b.scheduled_date ?? b.created_at;
      if (!d) return false;
      const date = new Date(d);
      return date >= thisMonthStart && date <= thisMonthEnd;
    }).length;

    // Revenue by month (last 6 months) for chart
    const revenueByMonth: { month: string; revenue: number; label: string }[] = [];
    for (let i = 5; i >= 0; i--) {
      const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1));
      const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i + 1, 0));
      const rev = allBookings
        .filter((b: { status: string; scheduled_date?: string; created_at?: string }) => {
          if (b.status === 'cancelled') return false;
          const d = b.scheduled_date ?? b.created_at;
          if (!d) return false;
          const date = new Date(d);
          return date >= start && date <= end;
        })
        .reduce((sum: number, b: { total_price?: number }) => sum + Number(b.total_price ?? 0), 0);
      revenueByMonth.push({
        month: `${start.getUTCFullYear()}-${String(start.getUTCMonth() + 1).padStart(2, '0')}`,
        revenue: Math.round(rev * 100) / 100,
        label: start.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
      });
    }

    // Bookings by status for chart
    const statusCounts: Record<string, number> = {};
    allBookings.forEach((b: { status: string }) => {
      const s = b.status || 'pending';
      statusCounts[s] = (statusCounts[s] ?? 0) + 1;
    });
    const bookingsByStatus = ['pending', 'confirmed', 'in_progress', 'completed', 'cancelled']
      .filter((s) => (statusCounts[s] ?? 0) > 0)
      .map((status) => ({ status, count: statusCounts[status] ?? 0 }));

    // Businesses by plan for pie chart
    const planCounts: Record<string, number> = {};
    businesses.forEach((b: { plan?: string }) => {
      const p = (b.plan || 'starter').toLowerCase();
      planCounts[p] = (planCounts[p] ?? 0) + 1;
    });
    const businessesByPlan = Object.entries(planCounts).map(([plan, count]) => ({
      plan: plan.charAt(0).toUpperCase() + plan.slice(1),
      count,
    }));

    // Revenue per business (for ARPB from bookings only; billing metrics use subscription tables below)
    const stripeConnectedCount = businesses.filter((b: { stripe_connect_account_id?: string | null }) => !!b.stripe_connect_account_id).length;
    const averageRevenuePerBusiness = totalBusinesses > 0 ? Math.round((totalRevenue / totalBusinesses) * 100) / 100 : 0;

    // Subscription-style counts (from business status; platform_subscriptions can override later)
    const activeSubscriptions = businesses.filter((b: { is_active?: boolean }) => b.is_active !== false).length;
    const canceledSubscriptions = businesses.filter((b: { is_active?: boolean }) => b.is_active === false).length;
    const trialSubscriptions = 0;

    const businessIdToName: Record<string, string> = Object.fromEntries(businesses.map((b: { id: string; name: string }) => [b.id, b.name]));

    // --- Subscription billing: revenue by plan, recent payments, upcoming renewals (from platform_* tables) ---
    let revenueByPlan: { plan: string; revenue: number; businessCount: number }[] = [];
    let recentPayments: { id?: string; business_id?: string; business_name: string; amount: number; date?: string; service: string; customer_name: string }[] = [];
    let upcomingPayments: { totalAmount: number; count: number; items: { id?: string; business_id?: string; business_name: string; amount: number; scheduled_date?: string; scheduled_time?: string; service: string; customer_name: string }[] } = { totalAmount: 0, count: 0, items: [] };

    try {
      const { data: plansRows } = await admin.from('platform_subscription_plans').select('id, slug, name, amount_cents');
      const plans = plansRows ?? [];
      const planIdToSlug: Record<string, string> = {};
      const planIdToName: Record<string, string> = {};
      const planSlugToAmount: Record<string, number> = {};
      plans.forEach((p: { id: string; slug: string; name: string; amount_cents: number }) => {
        planIdToSlug[p.id] = p.slug;
        planIdToName[p.id] = p.name;
        planSlugToAmount[p.slug] = (p.amount_cents ?? 0) / 100;
      });

      const { data: paymentsRows } = await admin
        .from('platform_payments')
        .select('id, business_id, plan_slug, amount_cents, paid_at, status, description')
        .eq('status', 'paid')
        .order('paid_at', { ascending: false });
      const allPayments = (paymentsRows ?? []) as { id: string; business_id: string; plan_slug: string; amount_cents: number; paid_at: string; status: string; description?: string }[];

      // Revenue by plan (subscription revenue from platform_payments)
      const planRevenueMap: Record<string, { revenue: number; businessIds: Set<string> }> = {};
      allPayments.forEach((p) => {
        const planKey = (p.plan_slug || 'starter').charAt(0).toUpperCase() + (p.plan_slug || 'starter').slice(1);
        if (!planRevenueMap[planKey]) planRevenueMap[planKey] = { revenue: 0, businessIds: new Set() };
        planRevenueMap[planKey].revenue += (p.amount_cents ?? 0) / 100;
        planRevenueMap[planKey].businessIds.add(p.business_id);
      });
      const { data: subsRows } = await admin.from('platform_subscriptions').select('business_id, plan_id');
      const subs = (subsRows ?? []) as { business_id: string; plan_id: string }[];
      const planIdToBusinessCount: Record<string, number> = {};
      subs.forEach((s) => {
        const slug = planIdToSlug[s.plan_id] || 'starter';
        const planKey = slug.charAt(0).toUpperCase() + slug.slice(1);
        planIdToBusinessCount[planKey] = (planIdToBusinessCount[planKey] ?? 0) + 1;
      });
      revenueByPlan = Object.entries(planRevenueMap).map(([plan, { revenue }]) => ({
        plan,
        revenue: Math.round(revenue * 100) / 100,
        businessCount: planIdToBusinessCount[plan] ?? 0,
      }));
      // Ensure all plans appear (from platform_subscription_plans)
      plans.forEach((p: { slug: string; name: string }) => {
        const planKey = (p.slug || 'starter').charAt(0).toUpperCase() + (p.slug || 'starter').slice(1);
        if (!revenueByPlan.some((r) => r.plan.toLowerCase() === planKey.toLowerCase())) {
          revenueByPlan.push({
            plan: planKey,
            revenue: 0,
            businessCount: (subs.filter((s) => (planIdToSlug[s.plan_id] || 'starter') === p.slug).length),
          });
        }
      });
      revenueByPlan.sort((a, b) => b.revenue - a.revenue);

      // Recent subscription payments (last 10)
      recentPayments = allPayments.slice(0, 10).map((p) => ({
        id: p.id,
        business_id: p.business_id,
        business_name: businessIdToName[p.business_id] ?? '—',
        amount: Math.round((p.amount_cents ?? 0) / 100 * 100) / 100,
        date: p.paid_at,
        service: p.description ?? `Subscription – ${(p.plan_slug || 'starter').charAt(0).toUpperCase() + (p.plan_slug || 'starter').slice(1)}`,
        customer_name: '—',
      }));

      // Upcoming subscription renewals (current_period_end >= today)
      const todayStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
      const { data: subsWithEnd } = await admin
        .from('platform_subscriptions')
        .select('id, business_id, plan_id, current_period_end')
        .eq('status', 'active')
        .not('current_period_end', 'is', null)
        .order('current_period_end', { ascending: true });
      const subsList = (subsWithEnd ?? []) as { id: string; business_id: string; plan_id: string; current_period_end: string }[];
      const upcomingSubs = subsList
        .filter((s) => s.current_period_end && new Date(s.current_period_end) >= todayStart)
        .slice(0, 10);
      const planIdToCents: Record<string, number> = {};
      plans.forEach((p: { id: string; amount_cents: number }) => { planIdToCents[p.id] = p.amount_cents ?? 0; });
      let upcomingTotal = 0;
      upcomingSubs.forEach((s) => { upcomingTotal += (planIdToCents[s.plan_id] ?? 0) / 100; });
      upcomingPayments = {
        totalAmount: Math.round(upcomingTotal * 100) / 100,
        count: subsList.filter((s) => s.current_period_end && new Date(s.current_period_end) >= todayStart).length,
        items: upcomingSubs.map((s) => ({
          id: s.id,
          business_id: s.business_id,
          business_name: businessIdToName[s.business_id] ?? '—',
          amount: Math.round((planIdToCents[s.plan_id] ?? 0) / 100 * 100) / 100,
          scheduled_date: s.current_period_end,
          scheduled_time: undefined,
          service: `Renewal – ${planIdToName[s.plan_id] ?? 'Plan'}`,
          customer_name: '—',
        })),
      };
    } catch (e) {
      console.warn('Platform subscription billing tables not available or error:', e);
      // Fallback: revenue by plan from businesses.plan count only (no payment revenue)
      const planCount: Record<string, number> = {};
      businesses.forEach((b: { plan?: string }) => {
        const p = (b.plan || 'starter').toLowerCase();
        const key = p.charAt(0).toUpperCase() + p.slice(1);
        planCount[key] = (planCount[key] ?? 0) + 1;
      });
      revenueByPlan = Object.entries(planCount).map(([plan, businessCount]) => ({ plan, revenue: 0, businessCount }));
      revenueByPlan.sort((a, b) => b.businessCount - a.businessCount);
    }

    const stats = {
      totalBusinesses,
      activeBusinesses,
      totalRevenue: Math.round(totalRevenue * 100) / 100,
      monthlyRevenue: Math.round(monthlyRevenue * 100) / 100,
      totalUsers: ownerIds.length,
      activeUsers: ownerIds.length,
      newBusinessesThisMonth,
      churnRate: 0,
      trialUsers: 0,
      conversionRate: 100,
      supportTickets: 0,
      avgResponseTime: 0,
      totalBookings,
      bookingsThisMonth,
      averageRevenuePerBusiness,
      stripeConnectedCount,
      activeSubscriptions,
      canceledSubscriptions,
      trialSubscriptions,
    };

    const businessesList = businesses.map((b: { id: string; name: string; owner_id: string | null; plan: string; is_active: boolean; created_at: string; business_email?: string }) => {
      const ownerId = b.owner_id ?? '';
      const info = byBusiness[b.id] ?? { count: 0, last: '' };
      return {
        id: b.id,
        name: b.name,
        owner_name: ownerNameMap[ownerId] ?? '—',
        owner_email: emailMap[ownerId] ?? b.business_email ?? '—',
        subscription_status: b.is_active !== false ? 'active' : 'canceled',
        trial_ends_at: null,
        plan_name: b.plan ?? 'starter',
        created_at: b.created_at,
        is_featured: false,
        monthly_revenue: 0,
        total_bookings: info.count,
        last_active: info.last || b.created_at,
        is_active: b.is_active !== false,
      };
    });

    // Platform users: business owners with profile + email
    const platformUsers = ownerIds.map((id) => ({
      id,
      full_name: ownerNameMap[id] ?? '—',
      email: emailMap[id] ?? '—',
      role: 'owner',
      is_active: true,
      last_login: null,
      created_at: '',
      business_count: businesses.filter((b: { owner_id: string | null }) => b.owner_id === id).length,
    }));

    // Providers + customers (for super-admin Users view)
    let providers: {
      id: string;
      business_id: string;
      business_name: string;
      full_name: string;
      email: string;
      status: string;
      created_at: string;
    }[] = [];
    let customers: {
      id: string;
      business_id: string;
      business_name: string;
      full_name: string;
      email: string;
      status: string;
      created_at: string;
    }[] = [];
    try {
      const businessIdToName = Object.fromEntries(businesses.map((b: { id: string; name: string }) => [b.id, b.name]));
      const [{ data: providersRows }, { data: customersRows }] = await Promise.all([
        admin
          .from("service_providers")
          .select("id, business_id, first_name, last_name, email, status, created_at")
          .order("created_at", { ascending: false })
          .limit(2000),
        admin
          .from("customers")
          .select("id, business_id, name, email, status, created_at")
          .order("created_at", { ascending: false })
          .limit(2000),
      ]);

      providers = (providersRows ?? []).map((p: any) => ({
        id: p.id,
        business_id: p.business_id,
        business_name: businessIdToName[p.business_id] ?? "—",
        full_name: [p.first_name, p.last_name].filter(Boolean).join(" ") || "—",
        email: p.email ?? "—",
        status: p.status ?? "active",
        created_at: p.created_at ?? "",
      }));

      customers = (customersRows ?? []).map((c: any) => ({
        id: c.id,
        business_id: c.business_id,
        business_name: businessIdToName[c.business_id] ?? "—",
        full_name: c.name ?? "—",
        email: c.email ?? "—",
        status: c.status ?? "active",
        created_at: c.created_at ?? "",
      }));
    } catch (e) {
      console.warn("Super admin providers/customers load:", e);
    }

    // Support tickets (table may not exist yet)
    let supportTicketsList: { id: string; subject: string; business_id: string; business_name: string; priority: string; status: string; requester_email?: string; assigned_to?: string; created_at: string; updated_at: string }[] = [];
    try {
      const { data: ticketsRows } = await admin
        .from('support_tickets')
        .select('id, business_id, subject, message, priority, status, requester_email, assigned_to, created_at, updated_at')
        .order('created_at', { ascending: false });
      const tickets = ticketsRows ?? [];
      const businessIdToName = Object.fromEntries(businesses.map((b: { id: string; name: string }) => [b.id, b.name]));
      supportTicketsList = tickets.map((t: { id: string; business_id: string; subject: string; priority: string; status: string; requester_email?: string; assigned_to?: string; created_at: string; updated_at: string }) => ({
        id: t.id,
        subject: t.subject,
        business_id: t.business_id,
        business_name: businessIdToName[t.business_id] ?? '—',
        priority: t.priority,
        status: t.status,
        requester_email: t.requester_email ?? undefined,
        assigned_to: t.assigned_to ?? '',
        created_at: t.created_at,
        updated_at: t.updated_at,
      }));
    } catch (_) {
      // support_tickets table may not exist
    }

    const supportTicketsCount = supportTicketsList.length;
    const statsWithSupport = { ...stats, supportTickets: supportTicketsCount };

    let platformSubscriptionsList: {
      id: string;
      business_id: string;
      business_name: string;
      plan_name: string;
      plan_slug: string;
      amount_cents: number;
      status: string;
      current_period_start: string | null;
      current_period_end: string | null;
      stripe_customer_id: string | null;
      stripe_subscription_id: string | null;
      authorize_net_subscription_id: string | null;
      updated_at: string | null;
    }[] = [];
    let paymentIssueCounts = { failed: 0, refunded: 0, pending: 0 };

    try {
      const { data: psRows } = await admin
        .from("platform_subscriptions")
        .select(
          "id, business_id, plan_id, status, current_period_start, current_period_end, stripe_customer_id, stripe_subscription_id, authorize_net_subscription_id, updated_at"
        )
        .order("updated_at", { ascending: false });
      const { data: planRowsForSubs } = await admin
        .from("platform_subscription_plans")
        .select("id, name, slug, amount_cents");
      const planById: Record<string, { name: string; slug: string; amount_cents: number }> = {};
      (planRowsForSubs ?? []).forEach((p: { id: string; name: string; slug: string; amount_cents: number }) => {
        planById[p.id] = { name: p.name, slug: p.slug, amount_cents: p.amount_cents ?? 0 };
      });
      platformSubscriptionsList = (psRows ?? []).map(
        (s: {
          id: string;
          business_id: string;
          plan_id: string;
          status: string;
          current_period_start: string | null;
          current_period_end: string | null;
          stripe_customer_id: string | null;
          stripe_subscription_id: string | null;
          authorize_net_subscription_id: string | null;
          updated_at: string | null;
        }) => {
          const pl = planById[s.plan_id];
          return {
            id: s.id,
            business_id: s.business_id,
            business_name: businessIdToName[s.business_id] ?? "—",
            plan_name: pl?.name ?? "—",
            plan_slug: pl?.slug ?? "",
            amount_cents: pl?.amount_cents ?? 0,
            status: s.status,
            current_period_start: s.current_period_start,
            current_period_end: s.current_period_end,
            stripe_customer_id: s.stripe_customer_id,
            stripe_subscription_id: s.stripe_subscription_id,
            authorize_net_subscription_id: s.authorize_net_subscription_id,
            updated_at: s.updated_at,
          };
        }
      );

      const [{ count: failedC }, { count: refundedC }, { count: pendingC }] = await Promise.all([
        admin.from("platform_payments").select("*", { count: "exact", head: true }).eq("status", "failed"),
        admin.from("platform_payments").select("*", { count: "exact", head: true }).eq("status", "refunded"),
        admin.from("platform_payments").select("*", { count: "exact", head: true }).eq("status", "pending"),
      ]);
      paymentIssueCounts = {
        failed: failedC ?? 0,
        refunded: refundedC ?? 0,
        pending: pendingC ?? 0,
      };
    } catch (e) {
      console.warn("Super admin platform subscriptions / payment counts:", e);
    }

    return NextResponse.json({
      stats: statsWithSupport,
      businesses: businessesList,
      platformUsers,
      providers,
      customers,
      supportTickets: supportTicketsList,
      charts: {
        revenueByMonth,
        bookingsByStatus,
        businessesByPlan,
      },
      billing: {
        averageRevenuePerBusiness,
        stripeConnectedCount,
        totalBusinessesForBilling: totalBusinesses,
        revenueByPlan,
        recentPayments,
        upcomingPayments,
        platformSubscriptions: platformSubscriptionsList,
        paymentIssueCounts,
        platformBillingProvider: getPlatformBillingProvider(),
      },
      subscriptions: {
        active: activeSubscriptions,
        canceled: canceledSubscriptions,
        trial: trialSubscriptions,
        total: totalBusinesses,
      },
    });
  } catch (err) {
    console.error('Super admin dashboard error:', err);
    return NextResponse.json({ error: 'Failed to load dashboard' }, { status: 500 });
  }
}
