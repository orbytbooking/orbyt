import { NextResponse } from "next/server";
import {
  createServiceRoleClient,
  findAuthUserIdByEmail,
  SIGNUP_EMAIL_ALREADY_EXISTS_MESSAGE,
} from "@/lib/auth-helpers";
import {
  isValidOwnerSignupEmail,
  normalizeOwnerSignupEmail,
} from "@/lib/signupEmailValidation";

export const dynamic = "force-dynamic";

/**
 * Pre-flight check for platform owner signup: valid format + no existing Auth user.
 */
export async function POST(request: Request) {
  const admin = createServiceRoleClient();
  if (!admin) {
    return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
  }

  let body: { email?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const email = normalizeOwnerSignupEmail(body.email ?? "");
  if (!isValidOwnerSignupEmail(email)) {
    return NextResponse.json(
      { available: false as const, error: "Please enter a valid email address." },
      { status: 400 }
    );
  }

  const existingAuthId = await findAuthUserIdByEmail(admin, email);
  if (existingAuthId) {
    return NextResponse.json({
      available: false as const,
      error: SIGNUP_EMAIL_ALREADY_EXISTS_MESSAGE,
    });
  }

  return NextResponse.json({ available: true as const });
}
