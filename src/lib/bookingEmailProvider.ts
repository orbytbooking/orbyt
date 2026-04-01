import type { SupabaseClient } from "@supabase/supabase-js";

/** Resolve display name + phone for customer-facing “booking confirmed” emails. */
export async function resolveProviderForCustomerBookingEmail(
  supabase: SupabaseClient,
  businessId: string,
  booking: { provider_id?: string | null; provider_name?: string | null }
): Promise<{ providerName: string | null; providerPhone: string | null }> {
  const denorm = (booking.provider_name ?? "").toString().trim();
  const pid = booking.provider_id ? String(booking.provider_id) : "";
  if (!pid) {
    return { providerName: denorm || null, providerPhone: null };
  }
  const { data } = await supabase
    .from("service_providers")
    .select("first_name, last_name, phone")
    .eq("id", pid)
    .eq("business_id", businessId)
    .maybeSingle();
  if (!data) {
    return { providerName: denorm || null, providerPhone: null };
  }
  const full = `${(data.first_name ?? "").toString().trim()} ${(data.last_name ?? "").toString().trim()}`.trim();
  const name = denorm || full || null;
  const phoneRaw = data.phone;
  const phone =
    phoneRaw != null && String(phoneRaw).trim() !== "" ? String(phoneRaw).trim() : null;
  return { providerName: name, providerPhone: phone };
}
