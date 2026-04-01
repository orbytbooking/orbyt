import { parsePhoneNumber } from "libphonenumber-js/min";
import type { Country } from "react-phone-number-input";

/**
 * Best-effort E.164 for PhoneInput `value` when loading legacy DB values (national or messy strings).
 */
export function normalizeStoredPhoneToE164(raw: string | null | undefined, defaultCountry: Country): string {
  const s = String(raw ?? "").trim();
  if (!s) return "";
  try {
    const p = parsePhoneNumber(s);
    if (p?.isValid()) return p.number;
  } catch {
    /* continue */
  }
  const digits = s.replace(/\D/g, "");
  if (!digits) return "";
  try {
    const p = parsePhoneNumber(digits, defaultCountry);
    if (p?.isValid()) return p.number;
  } catch {
    /* continue */
  }
  if (s.startsWith("+")) return s;
  return "";
}
