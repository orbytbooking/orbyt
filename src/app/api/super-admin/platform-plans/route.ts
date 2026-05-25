import { NextRequest, NextResponse } from "next/server";
import { requireSuperAdminGate } from "@/lib/auth-helpers";

export const dynamic = "force-dynamic";

const SLUG_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/;

function parseOptionalInt(v: unknown): number | null {
  if (v === undefined || v === null || v === "") return null;
  const n = typeof v === "number" ? v : parseInt(String(v), 10);
  if (Number.isNaN(n) || n < 0) return null;
  return n;
}

function parsePricingFeatures(v: unknown): Record<string, boolean | string> | null {
  if (v === undefined) return null;
  if (v === null) return null;
  if (typeof v !== "object" || Array.isArray(v)) return null;

  const out: Record<string, boolean | string> = {};
  const entries = Object.entries(v as Record<string, unknown>);
  for (const [k, val] of entries) {
    if (typeof val === "boolean") out[k] = val;
    else if (typeof val === "string") out[k] = val;
    else if (typeof val === "number" && Number.isFinite(val)) out[k] = String(val);
  }
  return out;
}

/** List all platform subscription plans (limits + pricing). */
export async function GET() {
  const gate = await requireSuperAdminGate();
  if (!gate.ok) return gate.response;

  const { admin } = gate;

  const { data, error } = await admin
    .from("platform_subscription_plans")
    .select(
      "id, name, slug, amount_cents, billing_interval, stripe_price_id, max_calendars, max_staff_users, max_bookings_per_month, pricing_features, is_active, description, created_at"
    )
    .order("amount_cents", { ascending: true });

  if (error) {
    console.error("[platform-plans GET]", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ plans: data ?? [] });
}

/**
 * Create a plan. Body:
 * { name, slug, amount_cents?, billing_interval?, stripe_price_id?,
 *   max_calendars?, max_staff_users?, max_bookings_per_month?, description?, is_active? }
 * Omit limit fields or send null for unlimited.
 */
export async function POST(request: NextRequest) {
  const gate = await requireSuperAdminGate();
  if (!gate.ok) return gate.response;

  const { admin } = gate;

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const name = String(body.name ?? "").trim();
  const slug = String(body.slug ?? "")
    .trim()
    .toLowerCase();
  if (!name) {
    return NextResponse.json({ error: "name is required" }, { status: 400 });
  }
  if (!slug || !SLUG_RE.test(slug)) {
    return NextResponse.json(
      { error: "slug is required (lowercase letters, numbers, hyphens only)" },
      { status: 400 }
    );
  }

  const amountCents =
    typeof body.amount_cents === "number" && Number.isFinite(body.amount_cents)
      ? Math.max(0, Math.round(body.amount_cents))
      : typeof body.amount_dollars === "number" && Number.isFinite(body.amount_dollars)
        ? Math.max(0, Math.round(body.amount_dollars * 100))
        : 0;

  const billingInterval =
    body.billing_interval === "yearly" || body.billing_interval === "monthly"
      ? body.billing_interval
      : "monthly";

  const pricingFeatures = parsePricingFeatures(body.pricing_features);

  const row = {
    name,
    slug,
    amount_cents: amountCents,
    billing_interval: billingInterval,
    stripe_price_id: body.stripe_price_id != null ? String(body.stripe_price_id).trim() || null : null,
    max_calendars: parseOptionalInt(body.max_calendars),
    max_staff_users: parseOptionalInt(body.max_staff_users),
    max_bookings_per_month: parseOptionalInt(body.max_bookings_per_month),
    description: body.description != null ? String(body.description).trim() || null : null,
    is_active: body.is_active === false ? false : true,
    pricing_features: pricingFeatures ?? {},
  };

  const { data, error } = await admin.from("platform_subscription_plans").insert(row).select("*").single();

  if (error) {
    console.error("[platform-plans POST]", error);
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ plan: data });
}
