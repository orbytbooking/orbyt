import { parsePhoneNumber, isValidPhoneNumber as isValidE164 } from "libphonenumber-js/min";
import type { Country } from "react-phone-number-input";

/**
 * When the user's default country (timezone) doesn't match a national-format number,
 * try these in order after `defaultCountry` (e.g. PH mobiles stored as 09…).
 */
const FALLBACK_PARSE_COUNTRIES: Country[] = [
  "PH",
  "IN",
  "ID",
  "TH",
  "MY",
  "SG",
  "VN",
  "US",
  "GB",
  "AU",
  "CA",
  "NZ",
  "JP",
  "KR",
  "DE",
  "FR",
  "ES",
  "IT",
  "NL",
  "BR",
  "MX",
  "NG",
  "AE",
  "SA",
  "ZA",
  "PK",
  "BD",
  "EG",
  "PL",
  "IE",
  "CH",
  "SE",
  "NO",
  "DK",
  "FI",
  "PT",
  "GR",
  "CZ",
  "RO",
  "HU",
  "IL",
  "AR",
  "CO",
  "CL",
  "PE",
];

function tryParseToE164(input: string, country?: Country): string | null {
  try {
    const p = country ? parsePhoneNumber(input, country) : parsePhoneNumber(input);
    if (p?.isValid()) return p.number;
  } catch {
    /* ignore */
  }
  return null;
}

/**
 * Best-effort E.164 for PhoneInput `value` when loading legacy DB values (national or messy strings).
 */
export function normalizeStoredPhoneToE164(raw: string | null | undefined, defaultCountry: Country): string {
  const s = String(raw ?? "").trim();
  if (!s) return "";

  const hitIntl = tryParseToE164(s);
  if (hitIntl) return hitIntl;

  const digits = s.replace(/\D/g, "");
  const countryOrder: Country[] = [
    defaultCountry,
    ...FALLBACK_PARSE_COUNTRIES.filter((c) => c !== defaultCountry),
  ];

  for (const country of countryOrder) {
    const hit = tryParseToE164(s, country) ?? (digits ? tryParseToE164(digits, country) : null);
    if (hit) return hit;
  }

  return "";
}

/**
 * Safe `value` for react-phone-number-input (E.164 or undefined — never pass national-only strings).
 *
 * Partial international input (`+` with more digits) must pass through unchanged. Otherwise
 * `isValidPhoneNumber` is false while typing, `normalizeStoredPhoneToE164` often returns "",
 * the parent gets `undefined`, and the controlled field resets / jumps country every keystroke.
 */
export function toPhoneInputValue(
  raw: string | null | undefined,
  defaultCountry: Country
): string | undefined {
  const t = String(raw ?? "").trim();
  if (!t) return undefined;
  if (isValidE164(t)) return t;
  if (t.startsWith("+") && t.length > 1) {
    return t;
  }
  const n = normalizeStoredPhoneToE164(t, defaultCountry);
  return n || undefined;
}
