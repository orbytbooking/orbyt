import { getCountries, type Country } from "react-phone-number-input";

const VALID_COUNTRIES = new Set(getCountries());

/**
 * Full IANA zone id → country (used when prefix rules would be wrong or ambiguous).
 */
const TIMEZONE_EXACT: Record<string, Country> = {
  "Asia/Shanghai": "CN",
  "Asia/Chongqing": "CN",
  "Asia/Urumqi": "CN",
  "Asia/Harbin": "CN",
  "Asia/Hong_Kong": "HK",
  "Asia/Macau": "MO",
  "Asia/Taipei": "TW",
  "Asia/Ho_Chi_Minh": "VN",
  "Asia/Tehran": "IR",
  "Asia/Tel_Aviv": "IL",
  "Asia/Jerusalem": "IL",
  "Asia/Riyadh": "SA",
  "Asia/Qatar": "QA",
  "Asia/Kuwait": "KW",
  "Asia/Bahrain": "BH",
  "Asia/Muscat": "OM",
  "Asia/Beirut": "LB",
  "Asia/Amman": "JO",
  "Asia/Baghdad": "IQ",
  "Asia/Karachi": "PK",
  "Asia/Dhaka": "BD",
  "Asia/Colombo": "LK",
  "Asia/Kathmandu": "NP",
  "Asia/Yangon": "MM",
  "Asia/Almaty": "KZ",
  "Asia/Tashkent": "UZ",
  "Asia/Baku": "AZ",
  "Asia/Yerevan": "AM",
  "Asia/Tbilisi": "GE",
  "Africa/Johannesburg": "ZA",
  "Africa/Lagos": "NG",
  "Africa/Cairo": "EG",
  "Africa/Nairobi": "KE",
  "Africa/Casablanca": "MA",
  "Atlantic/Reykjavik": "IS",
  "Pacific/Fiji": "FJ",
  "Pacific/Guam": "GU",
  "Pacific/Honolulu": "US",
  "Pacific/Chatham": "NZ",
};

/** Longest-prefix wins (e.g. America/Toronto before America/). */
const TIMEZONE_PREFIX_TO_COUNTRY: [string, Country][] = [
  ["America/Argentina/", "AR"],
  ["America/Sao_Paulo", "BR"],
  ["America/Mexico_City", "MX"],
  ["America/Cancun", "MX"],
  ["America/Merida", "MX"],
  ["America/Monterrey", "MX"],
  ["America/Mazatlan", "MX"],
  ["America/Chihuahua", "MX"],
  ["America/Tijuana", "MX"],
  ["America/Bahia_Banderas", "MX"],
  ["America/Santiago", "CL"],
  ["America/Bogota", "CO"],
  ["America/Lima", "PE"],
  ["America/La_Paz", "BO"],
  ["America/Caracas", "VE"],
  ["America/Montevideo", "UY"],
  ["America/Asuncion", "PY"],
  ["America/Guatemala", "GT"],
  ["America/Havana", "CU"],
  ["America/Jamaica", "JM"],
  ["America/El_Salvador", "SV"],
  ["America/Managua", "NI"],
  ["America/Costa_Rica", "CR"],
  ["America/Panama", "PA"],
  ["America/Barbados", "BB"],
  ["America/Belize", "BZ"],
  ["America/Port-au-Prince", "HT"],
  ["America/Santo_Domingo", "DO"],
  ["America/Puerto_Rico", "PR"],
  ["America/Toronto", "CA"],
  ["America/Vancouver", "CA"],
  ["America/Montreal", "CA"],
  ["America/Edmonton", "CA"],
  ["America/Winnipeg", "CA"],
  ["America/Halifax", "CA"],
  ["America/St_Johns", "CA"],
  ["America/Regina", "CA"],
  ["America/Whitehorse", "CA"],
  ["America/Yellowknife", "CA"],
  ["America/Iqaluit", "CA"],
  ["Pacific/Auckland", "NZ"],
  ["Australia/", "AU"],
  ["Asia/Manila", "PH"],
  ["Asia/Singapore", "SG"],
  ["Asia/Tokyo", "JP"],
  ["Asia/Seoul", "KR"],
  ["Asia/Dubai", "AE"],
  ["Asia/Kolkata", "IN"],
  ["Asia/Bangkok", "TH"],
  ["Asia/Jakarta", "ID"],
  ["Asia/Kuala_Lumpur", "MY"],
  ["Europe/London", "GB"],
  ["Europe/Dublin", "IE"],
  ["Europe/Paris", "FR"],
  ["Europe/Berlin", "DE"],
  ["Europe/Madrid", "ES"],
  ["Europe/Rome", "IT"],
  ["Europe/Amsterdam", "NL"],
  ["Europe/Brussels", "BE"],
  ["Europe/Zurich", "CH"],
  ["Europe/Vienna", "AT"],
  ["Europe/Warsaw", "PL"],
  ["Europe/Stockholm", "SE"],
  ["Europe/Oslo", "NO"],
  ["Europe/Copenhagen", "DK"],
  ["Europe/Helsinki", "FI"],
  ["Europe/Lisbon", "PT"],
  ["Europe/Athens", "GR"],
  ["Europe/Prague", "CZ"],
  ["Europe/Bucharest", "RO"],
  ["Europe/Budapest", "HU"],
  ["Europe/Kyiv", "UA"],
  ["Europe/Kiev", "UA"],
  ["Europe/Sofia", "BG"],
  ["Europe/Zagreb", "HR"],
  ["Europe/Belgrade", "RS"],
  ["America/", "US"],
].sort((a, b) => b[0].length - a[0].length);

function regionFromLocaleString(localeStr: string): Country | null {
  try {
    const region = new Intl.Locale(localeStr).maximize().region;
    if (region && VALID_COUNTRIES.has(region as Country)) return region as Country;
  } catch {
    /* ignore */
  }
  return null;
}

function guessCountryFromNavigatorLanguages(): Country | null {
  if (typeof navigator === "undefined") return null;
  const list = navigator.languages?.length ? [...navigator.languages] : [navigator.language];
  for (const loc of list) {
    if (!loc) continue;
    const c = regionFromLocaleString(loc);
    if (c) return c;
  }
  return null;
}

function guessCountryFromTimeZone(): Country | null {
  if (typeof Intl === "undefined" || typeof Intl.DateTimeFormat === "undefined") return null;
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (!tz) return null;

    const exact = TIMEZONE_EXACT[tz];
    if (exact && VALID_COUNTRIES.has(exact)) return exact;

    for (const [prefix, country] of TIMEZONE_PREFIX_TO_COUNTRY) {
      if (tz.startsWith(prefix) && VALID_COUNTRIES.has(country)) return country;
    }
  } catch {
    /* ignore */
  }
  return null;
}

/**
 * Default country: device IANA time zone first, then browser language regions, then US.
 */
export function guessDefaultCountry(): Country {
  if (typeof window === "undefined") return "US";
  return guessCountryFromTimeZone() ?? guessCountryFromNavigatorLanguages() ?? "US";
}
