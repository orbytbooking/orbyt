import { NextRequest, NextResponse } from "next/server";
import { requireSuperAdminGate } from "@/lib/auth-helpers";

export const dynamic = "force-dynamic";

function timeRangeToMonths(timeRange: string | null): number {
  const v = (timeRange ?? "").toLowerCase().trim();
  switch (v) {
    case "1month":
      return 1;
    case "3months":
      return 3;
    case "6months":
      return 6;
    case "12months":
    default:
      return 12;
  }
}

function getMonthListUtc(end: Date, months: number) {
  // Return array of month start dates covering last N months (inclusive of current month).
  const list: Date[] = [];
  const startMonth = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth() - (months - 1), 1));
  for (let i = 0; i < months; i++) {
    list.push(new Date(Date.UTC(startMonth.getUTCFullYear(), startMonth.getUTCMonth() + i, 1)));
  }
  return list;
}

function toIsoDateTime(d: Date) {
  return d.toISOString();
}

export async function GET(request: NextRequest) {
  const gate = await requireSuperAdminGate();
  if (!gate.ok) return gate.response;

  const { admin } = gate;

  const timeRangeParam = request.nextUrl.searchParams.get("timeRange");
  const months = timeRangeToMonths(timeRangeParam);
  const end = new Date();
  const monthStarts = getMonthListUtc(end, months);
  const start = monthStarts[0];
  const startISO = toIsoDateTime(start);
  const endISO = toIsoDateTime(end);

  const thisMonthStart = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), 1));

  try {
    // Businesses + owner counts
    const { data: businessesRows, error: bizError } = await admin
      .from("businesses")
      .select("id, owner_id, plan, is_active, created_at")
      .order("created_at", { ascending: false });

    if (bizError) {
      console.error("[super-admin analytics] businesses error:", bizError);
      return NextResponse.json({ error: "Failed to load businesses" }, { status: 500 });
    }

    const businesses = businessesRows ?? [];
    const totalBusinesses = businesses.length;
    const activeBusinesses = businesses.filter((b: any) => b.is_active !== false).length;
    const newBusinessesThisMonth = businesses.filter((b: any) => {
      if (!b.created_at) return false;
      const d = new Date(b.created_at);
      return d >= thisMonthStart && d <= end;
    }).length;

    const ownerIds = [
      ...new Set(businesses.map((b: any) => b.owner_id).filter(Boolean)),
    ] as string[];
    const totalUsers = ownerIds.length;
    const activeUserIds = [
      ...new Set(
        businesses
          .filter((b: any) => b.is_active !== false)
          .map((b: any) => b.owner_id)
          .filter(Boolean)
      ),
    ] as string[];
    const activeUsers = activeUserIds.length;

    // Platform plans
    const { data: plansRows, error: plansErr } = await admin
      .from("platform_subscription_plans")
      .select("id, slug, name, amount_cents");
    if (plansErr) console.warn("[super-admin analytics] plans error:", plansErr);

    const plans = plansRows ?? [];
    const planIdTo = new Map<string, { slug: string; name: string; amountCents: number }>();
    for (const p of plans as any[]) {
      planIdTo.set(p.id, {
        slug: p.slug ?? "starter",
        name: p.name ?? p.slug,
        amountCents: p.amount_cents ?? 0,
      });
    }

    // Subscriptions (trial/churn/MRR)
    const { data: subsRows, error: subsErr } = await admin
      .from("platform_subscriptions")
      .select("business_id, plan_id, status, updated_at, current_period_start, current_period_end");
    if (subsErr) console.warn("[super-admin analytics] subscriptions error:", subsErr);
    const subs = subsRows ?? [];

    // MRR from active subscriptions + plan amount
    const activeSubs = subs.filter((s: any) => s.status === "active");
    const mrrCents = activeSubs.reduce((sum: number, s: any) => {
      const plan = s.plan_id ? planIdTo.get(s.plan_id) : null;
      return sum + (plan?.amountCents ?? 0);
    }, 0);
    const mrr = Math.round((mrrCents / 100) * 100) / 100;
    const arr = Math.round(mrr * 12 * 100) / 100;

    // Churn rate (approx):
    // - churnedCount: distinct businesses whose subscription status became 'canceled' during range (using updated_at)
    // - denominator: distinct businesses in subscription table
    const subsDenom = new Set(subs.map((s: any) => s.business_id)).size || 1;
    const churnedBizIds = new Set(
      subs
        .filter((s: any) => {
          if (s.status !== "canceled") return false;
          if (!s.updated_at) return false;
          const d = new Date(s.updated_at);
          return d >= start && d <= end;
        })
        .map((s: any) => s.business_id)
    );
    const churnRate = Math.round(((churnedBizIds.size / subsDenom) * 100) * 10) / 10;

    // Conversion rate (trial -> paid) approximation:
    // - trialBizIds: subscriptions in 'trialing' whose current_period overlaps the range
    // - converted: those businesses with at least one paid platform_payment within that trial period
    const trialSubs = subs.filter((s: any) => {
      if (s.status !== "trialing") return false;
      if (!s.current_period_start || !s.current_period_end) return false;
      const ps = new Date(s.current_period_start);
      const pe = new Date(s.current_period_end);
      return ps <= end && pe >= start;
    });
    const trialBizIds = [...new Set(trialSubs.map((s: any) => s.business_id))] as string[];

    let conversionRate = 0;
    if (trialBizIds.length > 0) {
      const { data: trialPaymentsRows } = await admin
        .from("platform_payments")
        .select("business_id, paid_at")
        .eq("status", "paid")
        .in("business_id", trialBizIds)
        .gte("paid_at", startISO)
        .lte("paid_at", endISO);

      const trialPayments = (trialPaymentsRows ?? []) as { business_id: string; paid_at: string }[];
      const paymentsByBiz: Record<string, Date[]> = {};
      for (const p of trialPayments) {
        if (!paymentsByBiz[p.business_id]) paymentsByBiz[p.business_id] = [];
        paymentsByBiz[p.business_id].push(new Date(p.paid_at));
      }

      let convertedCount = 0;
      for (const t of trialSubs) {
        const ps = new Date(t.current_period_start);
        const pe = new Date(t.current_period_end);
        const paidDates = paymentsByBiz[t.business_id] ?? [];
        const ok = paidDates.some((d) => d >= ps && d <= pe);
        if (ok) convertedCount++;
      }

      const denom = trialBizIds.length;
      conversionRate = Math.round(((convertedCount / denom) * 100) * 10) / 10;
    }

    // Payments (revenue)
    const { data: paymentsRows, error: payErr } = await admin
      .from("platform_payments")
      .select("business_id, plan_slug, amount_cents, paid_at")
      .eq("status", "paid")
      .gte("paid_at", startISO)
      .lte("paid_at", endISO);
    if (payErr) console.warn("[super-admin analytics] payments error:", payErr);
    const payments = paymentsRows ?? [];

    const totalRevenue = Math.round(
      (payments.reduce((sum: number, p: any) => sum + (p.amount_cents ?? 0), 0) / 100) * 100
    ) / 100;

    // Monthly revenue = this month's total paid revenue
    const monthlyRevenue = Math.round(
      (payments
        .filter((p: any) => {
          if (!p.paid_at) return false;
          const d = new Date(p.paid_at);
          return d >= thisMonthStart && d <= end;
        })
        .reduce((sum: number, p: any) => sum + (p.amount_cents ?? 0), 0) /
        100) *
        100
    ) / 100;

    // Bookings for usage-per-tenant and "active users" approximation
    const { data: bookingsRows, error: bookingsErr } = await admin
      .from("bookings")
      .select("business_id, status, created_at")
      .gte("created_at", startISO)
      .lte("created_at", endISO);
    if (bookingsErr) console.warn("[super-admin analytics] bookings error:", bookingsErr);
    const bookings = bookingsRows ?? [];

    const bookingsNonCancelled = bookings.filter((b: any) => (b.status ?? "pending") !== "cancelled");
    const usageBusinesses = new Set(bookingsNonCancelled.map((b: any) => b.business_id)).size || 1;
    const usagePerTenant = Math.round(((bookingsNonCancelled.length / usageBusinesses) * 10)) / 10;

    const averageRevenuePerBusiness =
      activeBusinesses > 0 ? Math.round((totalRevenue / activeBusinesses) * 100) / 100 : 0;

    // Monthly performance table (approximate)
    const subsDenomSafe = subsDenom || 1;
    const monthlyData = monthStarts.map((mStart) => {
      const mEnd = new Date(Date.UTC(mStart.getUTCFullYear(), mStart.getUTCMonth() + 1, 0, 23, 59, 59, 999));

      const revenue = Math.round(
        (payments
          .filter((p: any) => {
            if (!p.paid_at) return false;
            const d = new Date(p.paid_at);
            return d >= mStart && d <= mEnd;
          })
          .reduce((sum: number, p: any) => sum + (p.amount_cents ?? 0), 0) /
          100) *
          100
      ) / 100;

      const newBusinesses = businesses.filter((b: any) => {
        if (!b.created_at) return false;
        const d = new Date(b.created_at);
        return d >= mStart && d <= mEnd;
      }).length;

      const activeBizInMonth = new Set(
        bookingsNonCancelled
          .filter((b: any) => {
            if (!b.created_at) return false;
            const d = new Date(b.created_at);
            return d >= mStart && d <= mEnd;
          })
          .map((b: any) => b.business_id)
      ).size;

      const churnedInMonth = new Set(
        subs
          .filter((s: any) => {
            if (s.status !== "canceled") return false;
            if (!s.updated_at) return false;
            const d = new Date(s.updated_at);
            return d >= mStart && d <= mEnd;
          })
          .map((s: any) => s.business_id)
      ).size;
      const churnRateMonth = Math.round((((churnedInMonth / subsDenomSafe) * 100) || 0) * 10) / 10;

      return {
        month: mStart.toLocaleDateString("en-US", { month: "short", year: "2-digit" }),
        newBusinesses,
        revenue,
        activeUsers: activeBizInMonth,
        churnRate: churnRateMonth,
      };
    });

    // Plan distribution
    const planDistribution = (plans ?? []).map((p: any) => {
      const planBizIds = new Set(
        subs
          .filter((s: any) => s.plan_id === p.id && s.status !== "canceled")
          .map((s: any) => s.business_id)
      );
      const count = planBizIds.size;
      const revenue = Math.round(
        (payments
          .filter((pay: any) => (pay.plan_slug ?? "starter") === (p.slug ?? "starter"))
          .reduce((sum: number, pay: any) => sum + (pay.amount_cents ?? 0), 0) /
          100) *
          100
      ) / 100;
      const percentage = totalBusinesses > 0 ? Math.round((count / totalBusinesses) * 1000) / 10 : 0;
      return {
        planName: p.name ?? p.slug ?? "starter",
        count,
        revenue,
        percentage,
      };
    });

    const analyticsData = {
      totalBusinesses,
      activeBusinesses,
      totalRevenue,
      monthlyRevenue,
      totalUsers,
      activeUsers,
      newBusinessesThisMonth,
      churnRate,
      mrr,
      arr,
      averageRevenuePerBusiness,
      conversionRate,
      usagePerTenant,
    };

    return NextResponse.json({ analyticsData, monthlyData, planDistribution });
  } catch (err) {
    console.error("[super-admin analytics] error:", err);
    return NextResponse.json({ error: "Failed to load analytics" }, { status: 500 });
  }
}

