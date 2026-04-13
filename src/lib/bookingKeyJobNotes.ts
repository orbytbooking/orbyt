/** Key access + customer job notes stored on `bookings.customization` (JSON). */

export type StoredKeyAccess = {
  primary_option: "someone_home" | "hide_keys";
  keep_key: boolean;
};

function normalizePrimaryOption(raw: unknown): "someone_home" | "hide_keys" | null {
  if (typeof raw !== "string") return null;
  const s = raw.trim().replace(/-/g, "_");
  if (s === "someone_home" || s === "hide_keys") return s;
  return null;
}

export function getKeyAccessFromCustomization(
  customization: Record<string, unknown> | null | undefined,
): StoredKeyAccess | null {
  if (!customization || typeof customization !== "object") return null;
  const raw = customization.key_access ?? customization.keyAccess;
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const o = raw as Record<string, unknown>;
  const primary = normalizePrimaryOption(o.primary_option);
  if (!primary) return null;
  return { primary_option: primary, keep_key: Boolean(o.keep_key) };
}

/** Human-readable line for booking summary sheets. */
export function formatKeyInformationSummary(
  customization: Record<string, unknown> | null | undefined,
): string | null {
  const ka = getKeyAccessFromCustomization(customization);
  if (!ka) return null;
  const main =
    ka.primary_option === "hide_keys" ? "I will hide the keys" : "Someone will be at home";
  return ka.keep_key ? `${main} · Keep key with provider` : main;
}

export function getJobNotesFromCustomization(
  customization: Record<string, unknown> | null | undefined,
): string | null {
  if (!customization || typeof customization !== "object") return null;
  const v = customization.customer_note_for_provider ?? customization.customerNoteForProvider;
  if (typeof v !== "string") return null;
  const t = v.trim();
  return t.length ? t : null;
}

/** Merge top-level `key_access` / `customer_note_for_provider` from admin (add-booking) payloads into customization. */
export function applyKeyAndJobNotesFromPayload(
  cust: Record<string, unknown>,
  bookingData: Record<string, unknown>,
): Record<string, unknown> {
  const out = { ...cust };
  if (Object.prototype.hasOwnProperty.call(bookingData, "key_access") || Object.prototype.hasOwnProperty.call(bookingData, "keyAccess")) {
    const kaRaw = bookingData.key_access ?? bookingData.keyAccess;
    if (kaRaw && typeof kaRaw === "object" && !Array.isArray(kaRaw)) {
      const r = kaRaw as Record<string, unknown>;
      const primary = normalizePrimaryOption(r.primary_option);
      if (primary) {
        out.key_access = { primary_option: primary, keep_key: Boolean(r.keep_key) };
      }
    }
  }
  if (Object.prototype.hasOwnProperty.call(bookingData, "customer_note_for_provider")) {
    const raw = bookingData.customer_note_for_provider;
    if (typeof raw === "string") {
      const t = raw.trim();
      if (t) out.customer_note_for_provider = t;
      else delete out.customer_note_for_provider;
    }
  }
  return out;
}
