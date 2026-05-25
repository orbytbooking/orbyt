import type { SupabaseClient } from "@supabase/supabase-js";

/** Escape `%` and `_` for PostgREST `ilike` exact match. */
export function escapeForIlikeExact(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/%/g, "\\%").replace(/_/g, "\\_");
}

const REDEMPTION_STATUSES = new Set(["pending", "confirmed", "in_progress", "completed"]);
type ScopeValue = "all" | "new" | "existing";

type Limitations = {
  customerScope?: ScopeValue;
  singleUsePerUser?: boolean;
};

function isRedemptionStatus(status: string | null | undefined): boolean {
  return REDEMPTION_STATUSES.has(String(status || "").toLowerCase());
}

export type MarketingCouponCustomerScopeResult =
  | { ok: true }
  | { ok: false; title: string; description: string };

export function couponRequiresCustomerEmailForScope(couponConfig: unknown): boolean {
  const c = couponConfig as { limitations?: Limitations } | null | undefined;
  const lim = c?.limitations;
  if (!lim || typeof lim !== "object") return false;
  return lim.singleUsePerUser === true || lim.customerScope === "new" || lim.customerScope === "existing";
}

export function couponUsesIdentityRules(couponConfig: unknown): boolean {
  return couponRequiresCustomerEmailForScope(couponConfig);
}

type BookingRow = {
  id: string;
  status: string | null;
  coupon_code: string | null;
  customer_id: string | null;
};

async function countCouponRedemptions(
  supabase: SupabaseClient,
  businessId: string,
  couponCode: string
): Promise<number> {
  const escCode = escapeForIlikeExact(couponCode.trim());
  const { data, error } = await supabase
    .from("bookings")
    .select("status")
    .eq("business_id", businessId)
    .ilike("coupon_code", escCode);
  if (error) {
    console.error("marketingCouponCustomerScope count redemptions:", error);
    return 0;
  }
  return (data || []).filter((r: { status?: string | null }) => isRedemptionStatus(r.status ?? null)).length;
}

async function loadBookingsForBusinessAndEmail(
  supabase: SupabaseClient,
  businessId: string,
  emailNorm: string
): Promise<BookingRow[]> {
  const esc = escapeForIlikeExact(emailNorm);
  const { data: byEmail, error: e1 } = await supabase
    .from("bookings")
    .select("id, status, coupon_code, customer_id")
    .eq("business_id", businessId)
    .ilike("customer_email", esc);
  if (e1) console.error("marketingCouponCustomerScope byEmail:", e1);

  const { data: custRows, error: e2 } = await supabase
    .from("customers")
    .select("id")
    .eq("business_id", businessId)
    .ilike("email", esc)
    .limit(50);
  if (e2) console.error("marketingCouponCustomerScope customers:", e2);

  const customerIds = [...new Set((custRows || []).map((r: { id: string }) => r.id).filter(Boolean))];
  let byCustomer: BookingRow[] = [];
  if (customerIds.length > 0) {
    const { data: bc, error: e3 } = await supabase
      .from("bookings")
      .select("id, status, coupon_code, customer_id")
      .eq("business_id", businessId)
      .in("customer_id", customerIds);
    if (e3) console.error("marketingCouponCustomerScope byCustomer:", e3);
    byCustomer = (bc || []) as BookingRow[];
  }

  const map = new Map<string, BookingRow>();
  for (const r of [...((byEmail || []) as BookingRow[]), ...byCustomer]) {
    if (r?.id) map.set(r.id, r);
  }
  return [...map.values()];
}

/**
 * Enforces Marketing → Coupons limitations:
 * - global usage_limit
 * - customerScope (new/existing)
 * - singleUsePerUser
 * Optional strong identity mode requires signed-in customer account.
 */
export async function evaluateMarketingCouponCustomerScope(
  supabase: SupabaseClient,
  args: {
    businessId: string;
    couponCode: string;
    couponConfig: unknown;
    customerEmail: string | null | undefined;
    usageLimit?: number | null;
    requireStrongIdentity?: boolean;
    customerAuthUserId?: string | null;
    authenticatedEmail?: string | null;
  }
): Promise<MarketingCouponCustomerScopeResult> {
  const lim = (args.couponConfig as { limitations?: Limitations } | null | undefined)?.limitations;
  const scope: ScopeValue =
    lim?.customerScope === "new" || lim?.customerScope === "existing" ? lim.customerScope : "all";
  const singleUse = lim?.singleUsePerUser === true;
  const codeNorm = String(args.couponCode || "").trim().toUpperCase();

  const usageLimit = Number(args.usageLimit ?? 0);
  if (Number.isFinite(usageLimit) && usageLimit > 0) {
    const redeemed = await countCouponRedemptions(supabase, args.businessId, codeNorm);
    if (redeemed >= usageLimit) {
      return {
        ok: false,
        title: "Coupon fully redeemed",
        description: "This coupon has reached its total usage limit and can no longer be applied.",
      };
    }
  }

  if (scope === "all" && !singleUse) return { ok: true };

  const raw = String(args.customerEmail ?? "").trim();
  if (!raw || !raw.includes("@")) {
    return {
      ok: false,
      title: "Email required",
      description:
        "Enter the email you will use for this booking. This coupon checks whether you are a new or existing customer, or prior use of this code.",
    };
  }
  const emailNorm = raw.toLowerCase();

  if (args.requireStrongIdentity) {
    if (!args.customerAuthUserId) {
      return { ok: false, title: "Sign in required", description: "Please sign in to use this coupon." };
    }
    const authEmail = String(args.authenticatedEmail ?? "").trim().toLowerCase();
    if (authEmail && authEmail !== emailNorm) {
      return {
        ok: false,
        title: "Email mismatch",
        description: "Use the same email as your signed-in customer account to apply this coupon.",
      };
    }

    const { data: cRow } = await supabase
      .from("customers")
      .select("id, email")
      .eq("business_id", args.businessId)
      .eq("auth_user_id", args.customerAuthUserId)
      .maybeSingle();
    if (!cRow?.id) {
      return {
        ok: false,
        title: "Customer account required",
        description: "Your signed-in account is not linked to a customer profile for this business.",
      };
    }
    const cEmail = String((cRow as { email?: string | null }).email ?? "").trim().toLowerCase();
    if (cEmail && cEmail !== emailNorm) {
      return {
        ok: false,
        title: "Email mismatch",
        description: "Use the same email as your signed-in customer account to apply this coupon.",
      };
    }
  }

  const rows = await loadBookingsForBusinessAndEmail(supabase, args.businessId, emailNorm);
  const hasPriorServiceBooking = rows.some((r) => isRedemptionStatus(r.status));
  const hasUsedThisCoupon = rows.some(
    (r) =>
      isRedemptionStatus(r.status) &&
      r.coupon_code != null &&
      String(r.coupon_code).trim().toUpperCase() === codeNorm
  );

  if (scope === "new" && hasPriorServiceBooking) {
    return {
      ok: false,
      title: "New customers only",
      description: "This coupon is limited to customers who have not booked with us before.",
    };
  }
  if (scope === "existing" && !hasPriorServiceBooking) {
    return {
      ok: false,
      title: "Existing customers only",
      description: "This coupon is for customers who already have a booking history with us.",
    };
  }
  if (singleUse && hasUsedThisCoupon) {
    return {
      ok: false,
      title: "Coupon already used",
      description: "This coupon can only be used once per customer account for this business.",
    };
  }

  return { ok: true };
}
