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

  if (body.key !== undefined) updates.key = String(body.key ?? "").trim();
  if (body.name !== undefined) updates.name = String(body.name ?? "").trim();
  if (body.subject !== undefined) updates.subject = String(body.subject ?? "").trim();
  if (body.body_text !== undefined) updates.body_text = String(body.body_text ?? "").trim();
  if (body.body_html !== undefined) updates.body_html = String(body.body_html ?? "").trim();
  if (body.is_active !== undefined) updates.is_active = body.is_active === false ? false : true;

  const { data, error } = await admin
    .from("platform_email_templates")
    .update(updates)
    .eq("id", id)
    .select("*")
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  if (!data) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ template: data });
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

  const { error } = await admin.from("platform_email_templates").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}

