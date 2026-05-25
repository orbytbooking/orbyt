import { NextRequest, NextResponse } from "next/server";
import { requireSuperAdminGate } from "@/lib/auth-helpers";

export const dynamic = "force-dynamic";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const gate = await requireSuperAdminGate();
  if (!gate.ok) return gate.response;
  const { admin } = gate;

  const { id } = await params;
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const body = await request.json().catch(() => ({}));
  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };

  if (body.title !== undefined) updates.title = String(body.title ?? "").trim();
  if (body.body !== undefined) updates.body = String(body.body ?? "").trim();
  if (body.level !== undefined) {
    const level = String(body.level ?? "info").toLowerCase();
    if (!["info", "warning", "maintenance", "success"].includes(level)) {
      return NextResponse.json({ error: "Invalid level" }, { status: 400 });
    }
    updates.level = level;
  }
  if (body.is_active !== undefined) updates.is_active = body.is_active === false ? false : true;
  if (body.starts_at !== undefined) updates.starts_at = body.starts_at ? String(body.starts_at) : null;
  if (body.ends_at !== undefined) updates.ends_at = body.ends_at ? String(body.ends_at) : null;
  if (body.audience !== undefined) {
    const raw = String(body.audience ?? "all").toLowerCase();
    if (!["all", "owners", "providers", "customers"].includes(raw)) {
      return NextResponse.json({ error: "Invalid audience" }, { status: 400 });
    }
    updates.audience = raw;
  }

  const { data, error } = await admin
    .from("platform_announcements")
    .update(updates)
    .eq("id", id)
    .select("*")
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  if (!data) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ announcement: data });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const gate = await requireSuperAdminGate();
  if (!gate.ok) return gate.response;
  const { admin } = gate;
  const { id } = await params;
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const { error } = await admin.from("platform_announcements").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}

