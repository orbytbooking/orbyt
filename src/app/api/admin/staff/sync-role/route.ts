import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  requireAdminTenantContext,
  assertBusinessIdMatchesContext,
} from "@/lib/adminTenantContext";

type CrmRole = "admin" | "manager" | "staff";

function normalizeStaffRole(r: unknown): CrmRole {
  const s = typeof r === "string" ? r.toLowerCase().trim() : "";
  if (s === "admin" || s === "manager" || s === "staff") return s;
  return "staff";
}

const bodySchema = z.object({
  staffId: z.string().uuid(),
  businessId: z.string().uuid().optional(),
});

/**
 * After `staff.role` is updated in the UI, sync tenant_users + profiles + auth metadata
 * so CRM access and JWT role match the staff record (for users who already accepted an invite).
 */
export async function POST(request: NextRequest) {
  const ctx = await requireAdminTenantContext(request);
  if (ctx instanceof NextResponse) return ctx;
  const { supabase, businessId } = ctx;

  let parsed: z.infer<typeof bodySchema>;
  try {
    parsed = bodySchema.parse(await request.json());
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const mismatch = assertBusinessIdMatchesContext(parsed.businessId, businessId);
  if (mismatch) return mismatch;

  const { data: staff, error: staffErr } = await supabase
    .from("staff")
    .select("id, user_id, business_id, role, permissions")
    .eq("id", parsed.staffId)
    .eq("business_id", businessId)
    .maybeSingle();

  if (staffErr || !staff) {
    return NextResponse.json({ error: "Staff not found" }, { status: 404 });
  }

  const userId = staff.user_id as string | null | undefined;
  if (!userId) {
    return NextResponse.json({ ok: true, synced: false, reason: "no_user_yet" });
  }

  const crmRole = normalizeStaffRole(staff.role);
  const permRaw = (staff as { permissions?: unknown }).permissions;
  const permissionsJson =
    permRaw != null && typeof permRaw === "object" && !Array.isArray(permRaw)
      ? permRaw
      : null;
  const now = new Date().toISOString();

  const { data: prof } = await supabase.from("profiles").select("role").eq("id", userId).maybeSingle();
  if ((prof?.role as string | undefined)?.toLowerCase() === "owner") {
    return NextResponse.json({ ok: true, synced: false, reason: "owner_profile_skip" });
  }

  const { data: existingTu } = await supabase
    .from("tenant_users")
    .select("id")
    .eq("business_id", businessId)
    .eq("user_id", userId)
    .maybeSingle();

  if (existingTu) {
    const { error: tuUpd } = await supabase
      .from("tenant_users")
      .update({
        role: crmRole,
        updated_at: now,
        ...(permissionsJson !== null ? { permissions: permissionsJson } : {}),
      })
      .eq("business_id", businessId)
      .eq("user_id", userId);
    if (tuUpd) {
      console.error("tenant_users update:", tuUpd);
      return NextResponse.json({ error: "Could not update team access" }, { status: 500 });
    }
  } else {
    const { error: tuIns } = await supabase.from("tenant_users").insert({
      business_id: businessId,
      user_id: userId,
      role: crmRole,
      is_active: true,
      ...(permissionsJson !== null ? { permissions: permissionsJson } : {}),
    });
    if (tuIns) {
      console.error("tenant_users insert:", tuIns);
      return NextResponse.json({ error: "Could not create team access row" }, { status: 500 });
    }
  }

  const { error: profErr } = await supabase.from("profiles").update({ role: crmRole }).eq("id", userId);
  if (profErr) {
    console.warn("profiles role update:", profErr);
  }

  try {
    const { data: authUser, error: getAuthErr } = await supabase.auth.admin.getUserById(userId);
    if (getAuthErr || !authUser?.user) {
      return NextResponse.json({ ok: true, synced: true, auth: false });
    }
    const meta = { ...(authUser.user.user_metadata ?? {}), role: crmRole };
    const { error: authUpdErr } = await supabase.auth.admin.updateUserById(userId, {
      user_metadata: meta,
    });
    if (authUpdErr) {
      console.warn("auth metadata update:", authUpdErr);
      return NextResponse.json({ ok: true, synced: true, auth: false });
    }
  } catch (e) {
    console.warn("sync-role auth:", e);
    return NextResponse.json({ ok: true, synced: true, auth: false });
  }

  return NextResponse.json({ ok: true, synced: true, auth: true });
}
