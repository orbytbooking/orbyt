import type { SupabaseClient, User } from "@supabase/supabase-js";

export type CustomerRowForBooking = {
  id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  access_blocked?: boolean;
  booking_blocked?: boolean;
};

export type EnsureCustomerRowResult =
  | { ok: true; customer: CustomerRowForBooking }
  | { ok: false; error: string; status: number };

/**
 * Resolves the `customers` row for an authenticated Supabase user and a business.
 * Book-now sends a session whenever `getSession()` exists, but the user may have no row
 * for this business (signup trigger used another business, guest record, OAuth without customer insert, etc.).
 * - Returns existing row when auth_user_id + business_id match.
 * - Links an existing guest row (same email, null auth_user_id) to this user.
 * - Creates a new row when appropriate.
 */
export async function ensureCustomerRowForBusiness(
  supabase: SupabaseClient,
  user: User,
  businessId: string,
  profileFromBooking?: {
    customer_name?: unknown;
    customer_email?: unknown;
    customer_phone?: unknown;
    address?: unknown;
  }
): Promise<EnsureCustomerRowResult> {
  const { data: direct } = await supabase
    .from("customers")
    .select("id, name, email, phone, access_blocked, booking_blocked")
    .eq("auth_user_id", user.id)
    .eq("business_id", businessId)
    .maybeSingle();

  if (direct) {
    return { ok: true, customer: direct };
  }

  const emailRaw =
    (profileFromBooking?.customer_email != null
      ? String(profileFromBooking.customer_email).trim()
      : "") ||
    (user.email ? user.email.trim() : "");
  const emailNorm = emailRaw.toLowerCase();

  const meta = (user.user_metadata || {}) as Record<string, unknown>;
  const nameFromMeta = typeof meta.full_name === "string" ? meta.full_name.trim() : "";
  const nameFromBooking =
    profileFromBooking?.customer_name != null
      ? String(profileFromBooking.customer_name).trim()
      : "";
  const displayName =
    nameFromBooking ||
    nameFromMeta ||
    (emailNorm ? emailNorm.split("@")[0] : "") ||
    "Customer";

  if (!emailNorm) {
    return {
      ok: false,
      error: "Customer email is required to complete your booking for this business.",
      status: 400,
    };
  }

  const { data: byEmail } = await supabase
    .from("customers")
    .select("id, auth_user_id, name, email, phone, access_blocked, booking_blocked")
    .eq("business_id", businessId)
    .ilike("email", emailNorm)
    .maybeSingle();

  if (byEmail) {
    if (byEmail.auth_user_id && byEmail.auth_user_id !== user.id) {
      return {
        ok: false,
        error: "An account with this email already exists for this business. Sign in with that account.",
        status: 409,
      };
    }

    const phone =
      profileFromBooking?.customer_phone != null
        ? String(profileFromBooking.customer_phone).trim() || null
        : byEmail.phone ?? null;
    const patch: Record<string, unknown> = {
      auth_user_id: user.id,
      email: emailNorm,
    };
    if (displayName) patch.name = displayName;
    if (phone != null) patch.phone = phone;
    if (profileFromBooking?.address != null) {
      const addr = String(profileFromBooking.address).trim();
      if (addr) patch.address = addr;
    }

    const { data: linked, error: linkErr } = await supabase
      .from("customers")
      .update(patch)
      .eq("id", byEmail.id)
      .select("id, name, email, phone, access_blocked, booking_blocked")
      .single();

    if (linkErr || !linked) {
      console.error("ensureCustomerRowForBusiness: link guest customer failed", linkErr);
      return {
        ok: false,
        error: "Could not link your account to this business. Please contact support.",
        status: 500,
      };
    }
    return { ok: true, customer: linked };
  }

  const phoneInsert =
    profileFromBooking?.customer_phone != null
      ? String(profileFromBooking.customer_phone).trim() || null
      : null;
  const addressInsert =
    profileFromBooking?.address != null ? String(profileFromBooking.address).trim() || null : null;

  const { data: inserted, error: insErr } = await supabase
    .from("customers")
    .insert({
      auth_user_id: user.id,
      business_id: businessId,
      email: emailNorm,
      name: displayName || emailNorm,
      phone: phoneInsert,
      address: addressInsert,
      status: "active",
      email_notifications: true,
      sms_notifications: true,
      push_notifications: true,
    })
    .select("id, name, email, phone, access_blocked, booking_blocked")
    .single();

  if (!insErr && inserted) {
    return { ok: true, customer: inserted };
  }

  // Race: another request created the same email+business row
  if (insErr) {
    console.warn("ensureCustomerRowForBusiness: insert failed, retrying lookup", insErr.message);
    const { data: retryEmail } = await supabase
      .from("customers")
      .select("id, auth_user_id, name, email, phone, access_blocked, booking_blocked")
      .eq("business_id", businessId)
      .ilike("email", emailNorm)
      .maybeSingle();

    if (retryEmail) {
      if (retryEmail.auth_user_id && retryEmail.auth_user_id !== user.id) {
        return {
          ok: false,
          error: "An account with this email already exists for this business. Sign in with that account.",
          status: 409,
        };
      }
      const { data: linked2, error: link2Err } = await supabase
        .from("customers")
        .update({
          auth_user_id: user.id,
          name: displayName || retryEmail.name,
          ...(phoneInsert != null ? { phone: phoneInsert } : {}),
          ...(addressInsert ? { address: addressInsert } : {}),
        })
        .eq("id", retryEmail.id)
        .select("id, name, email, phone, access_blocked, booking_blocked")
        .single();
      if (!link2Err && linked2) {
        return { ok: true, customer: linked2 };
      }
    }
  }

  console.error("ensureCustomerRowForBusiness: could not create customer", insErr);
  return {
    ok: false,
    error: "Could not create your customer profile for this business. Please try again.",
    status: 500,
  };
}
