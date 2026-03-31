import type { SupabaseClient } from "@supabase/supabase-js";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/** Only treat well-formed UUIDs as customer ids (junk strings skip link/create by email). */
export function parseBookingCustomerId(raw: unknown): string | null {
  if (raw == null) return null;
  const s = typeof raw === "string" ? raw.trim() : "";
  if (!s) return null;
  return UUID_RE.test(s) ? s : null;
}

/**
 * Ensures a customers row exists for admin booking create/update.
 * - Validates client customer_id and that the row belongs to this business.
 * - Otherwise finds or creates by email (normalized); handles unique violations.
 */
export async function ensureCustomerForAdminBooking(
  supabase: SupabaseClient,
  businessId: string,
  opts: {
    customerIdFromClient: unknown;
    customerEmail: string;
    customerName: string;
    customerPhone: string | null;
    customerAddress: string | null;
  }
): Promise<string | null> {
  let customerId = parseBookingCustomerId(opts.customerIdFromClient);
  const emailRaw = opts.customerEmail.trim();
  const emailNorm = emailRaw.toLowerCase();
  const name = opts.customerName.trim();
  const phone = opts.customerPhone?.trim() || null;
  const address = opts.customerAddress?.trim() || null;

  if (customerId) {
    const { data: row } = await supabase
      .from("customers")
      .select("id")
      .eq("business_id", businessId)
      .eq("id", customerId)
      .maybeSingle();
    if (row?.id) return customerId;
    customerId = null;
  }

  if (!emailNorm) return null;

  const { data: existing } = await supabase
    .from("customers")
    .select("id")
    .eq("business_id", businessId)
    .ilike("email", emailNorm)
    .maybeSingle();
  if (existing?.id) return existing.id;

  const { data: upserted, error: upErr } = await supabase
    .from("customers")
    .upsert(
      {
        business_id: businessId,
        name: name || emailNorm || emailRaw,
        email: emailNorm,
        phone,
        address,
      },
      { onConflict: "email,business_id" }
    )
    .select("id")
    .single();

  if (!upErr && upserted?.id) return upserted.id;

  console.error("ensureCustomerForAdminBooking: customers upsert failed", upErr);
  return null;
}
