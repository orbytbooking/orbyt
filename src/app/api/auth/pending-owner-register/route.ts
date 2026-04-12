import { NextResponse } from "next/server";
import {
  createServiceRoleClient,
  findAuthUserIdByEmail,
  SIGNUP_EMAIL_ALREADY_EXISTS_MESSAGE,
} from "@/lib/auth-helpers";
import { encryptPendingOwnerPassword } from "@/lib/pendingOwnerCrypto";
import type { PendingOwnerPayload } from "@/lib/webhooks/processPendingOwnerCheckout";
import {
  isValidOwnerSignupEmail,
  normalizeOwnerSignupEmail,
} from "@/lib/signupEmailValidation";

export const dynamic = "force-dynamic";

/**
 * Store pre-payment owner onboarding (email + encrypted password + payload).
 * Next step: POST /api/platform/billing/create-checkout-pending with returned pendingId.
 */
export async function POST(request: Request) {
  const admin = createServiceRoleClient();
  if (!admin) {
    return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
  }

  let body: {
    email?: string;
    password?: string;
    payload?: PendingOwnerPayload;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const email = normalizeOwnerSignupEmail(body.email ?? "");
  const password = body.password ?? "";
  const payload = body.payload;

  if (!isValidOwnerSignupEmail(email)) {
    return NextResponse.json({ error: "Please enter a valid email address." }, { status: 400 });
  }
  if (password.length < 6) {
    return NextResponse.json({ error: "Password must be at least 6 characters" }, { status: 400 });
  }
  if (
    !payload?.fullName?.trim() ||
    !payload?.businessName?.trim() ||
    !payload?.businessCategory?.trim() ||
    !payload?.plan?.trim()
  ) {
    return NextResponse.json(
      { error: "payload must include fullName, businessName, businessCategory, plan" },
      { status: 400 }
    );
  }

  const existingAuthId = await findAuthUserIdByEmail(admin, email);
  if (existingAuthId) {
    return NextResponse.json(
      { error: SIGNUP_EMAIL_ALREADY_EXISTS_MESSAGE, code: "email_already_exists" as const },
      { status: 409 }
    );
  }

  let encrypted: string;
  try {
    encrypted = encryptPendingOwnerPassword(password);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Encryption error";
    console.error("[pending-owner-register]", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }

  const normalized: PendingOwnerPayload = {
    fullName: payload.fullName.trim(),
    phone: (payload.phone ?? "").trim(),
    businessName: payload.businessName.trim(),
    businessAddress: payload.businessAddress?.trim() || null,
    businessCategory: payload.businessCategory.trim(),
    plan: payload.plan.trim().toLowerCase(),
  };

  const { data: existing } = await admin
    .from("pending_owner_onboarding")
    .select("id")
    .eq("email", email)
    .is("consumed_at", null)
    .maybeSingle();

  if (existing?.id) {
    const { data: updated, error: upErr } = await admin
      .from("pending_owner_onboarding")
      .update({
        password_encrypted: encrypted,
        payload: normalized as unknown as Record<string, unknown>,
      })
      .eq("id", (existing as { id: string }).id)
      .select("id")
      .single();

    if (upErr || !updated) {
      console.error("[pending-owner-register] update:", upErr);
      return NextResponse.json({ error: upErr?.message ?? "Could not save" }, { status: 500 });
    }
    return NextResponse.json({ pendingId: (updated as { id: string }).id });
  }

  const { data: inserted, error: insErr } = await admin
    .from("pending_owner_onboarding")
    .insert({
      email,
      password_encrypted: encrypted,
      payload: normalized as unknown as Record<string, unknown>,
    })
    .select("id")
    .single();

  if (insErr || !inserted) {
    console.error("[pending-owner-register] insert:", insErr);
    return NextResponse.json({ error: insErr?.message ?? "Could not save onboarding" }, { status: 500 });
  }

  return NextResponse.json({ pendingId: (inserted as { id: string }).id });
}
