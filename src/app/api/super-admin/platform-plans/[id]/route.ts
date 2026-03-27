import { NextRequest, NextResponse } from "next/server";
import { requireSuperAdminGate } from "@/lib/auth-helpers";

export const dynamic = "force-dynamic";

const SLUG_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/;

function parseOptionalInt(v: unknown): number | null | undefined {
  if (v === undefined) return undefined;
  if (v === null || v === "") return null;
  const n = typeof v === "number" ? v : parseInt(String(v), 10);
  if (Number.isNaN(n) || n < 0) return undefined;
  return n;
}

function parsePricingFeatures(v: unknown): Record<string, boolean | string> | null | undefined {
  if (v === undefined) return undefined;
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

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const gate = await requireSuperAdminGate();
  if (!gate.ok) return gate.response;

  const { admin } = gate;

  const { id } = await params;
  if (!id) {
    return NextResponse.json({ error: "Plan id required" }, { status: 400 });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const updates: Record<string, unknown> = {};

  if (body.name !== undefined) {
    const name = String(body.name).trim();
    if (!name) return NextResponse.json({ error: "name cannot be empty" }, { status: 400 });
    updates.name = name;
  }

  if (body.slug !== undefined) {
    const slug = String(body.slug).trim().toLowerCase();
    if (!slug || !SLUG_RE.test(slug)) {
      return NextResponse.json({ error: "Invalid slug" }, { status: 400 });
    }
    updates.slug = slug;
  }

  if (body.amount_cents !== undefined) {
    const n = Number(body.amount_cents);
    if (!Number.isFinite(n) || n < 0) {
      return NextResponse.json({ error: "Invalid amount_cents" }, { status: 400 });
    }
    updates.amount_cents = Math.round(n);
  }

  if (body.amount_dollars !== undefined && body.amount_cents === undefined) {
    const n = Number(body.amount_dollars);
    if (!Number.isFinite(n) || n < 0) {
      return NextResponse.json({ error: "Invalid amount_dollars" }, { status: 400 });
    }
    updates.amount_cents = Math.round(n * 100);
  }

  if (body.billing_interval !== undefined) {
    if (body.billing_interval !== "monthly" && body.billing_interval !== "yearly") {
      return NextResponse.json({ error: "billing_interval must be monthly or yearly" }, { status: 400 });
    }
    updates.billing_interval = body.billing_interval;
  }

  if (body.stripe_price_id !== undefined) {
    updates.stripe_price_id = body.stripe_price_id == null ? null : String(body.stripe_price_id).trim() || null;
  }

  if (body.max_calendars !== undefined) {
    const v = parseOptionalInt(body.max_calendars);
    if (v === undefined && body.max_calendars !== null && body.max_calendars !== "") {
      return NextResponse.json({ error: "Invalid max_calendars" }, { status: 400 });
    }
    updates.max_calendars = v ?? null;
  }

  if (body.max_staff_users !== undefined) {
    const v = parseOptionalInt(body.max_staff_users);
    if (v === undefined && body.max_staff_users !== null && body.max_staff_users !== "") {
      return NextResponse.json({ error: "Invalid max_staff_users" }, { status: 400 });
    }
    updates.max_staff_users = v ?? null;
  }

  if (body.max_bookings_per_month !== undefined) {
    const v = parseOptionalInt(body.max_bookings_per_month);
    if (v === undefined && body.max_bookings_per_month !== null && body.max_bookings_per_month !== "") {
      return NextResponse.json({ error: "Invalid max_bookings_per_month" }, { status: 400 });
    }
    updates.max_bookings_per_month = v ?? null;
  }

  if (body.description !== undefined) {
    updates.description = body.description == null ? null : String(body.description).trim() || null;
  }

  if (body.is_active !== undefined) {
    updates.is_active = Boolean(body.is_active);
  }

  if (body.pricing_features !== undefined) {
    const parsed = parsePricingFeatures(body.pricing_features);
    if (parsed === null) {
      return NextResponse.json({ error: "Invalid pricing_features" }, { status: 400 });
    }
    // Column is NOT NULL (default {}), so store {} instead of null.
    updates.pricing_features = parsed ?? {};
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
  }

  const { data, error } = await admin
    .from("platform_subscription_plans")
    .update(updates)
    .eq("id", id)
    .select("*")
    .maybeSingle();

  if (error) {
    console.error("[platform-plans PATCH]", error);
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  if (!data) {
    return NextResponse.json({ error: "Plan not found" }, { status: 404 });
  }

  return NextResponse.json({ plan: data });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const gate = await requireSuperAdminGate();
  if (!gate.ok) return gate.response;

  const { admin } = gate;

  const { id } = await params;
  if (!id) {
    return NextResponse.json({ error: "Plan id required" }, { status: 400 });
  }

  const { count, error: countError } = await admin
    .from("platform_subscriptions")
    .select("id", { count: "exact", head: true })
    .eq("plan_id", id);

  if (countError) {
    return NextResponse.json({ error: countError.message }, { status: 400 });
  }

  if ((count ?? 0) > 0) {
    return NextResponse.json(
      { error: "Cannot delete a plan that is assigned to one or more businesses. Deactivate it instead." },
      { status: 409 }
    );
  }

  const { error } = await admin.from("platform_subscription_plans").delete().eq("id", id);

  if (error) {
    console.error("[platform-plans DELETE]", error);
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ success: true });
}
