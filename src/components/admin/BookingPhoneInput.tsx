"use client";

import { useLayoutEffect, useState } from "react";
import PhoneInput, { getCountries, type Country, type Value } from "react-phone-number-input";
import "react-phone-number-input/style.css";
import { cn } from "@/lib/utils";

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
 * Default country: system IANA time zone first (automatic / OS clock), then language, then US.
 */
export function guessDefaultCountry(): Country {
  if (typeof window === "undefined") return "US";
  return guessCountryFromTimeZone() ?? guessCountryFromNavigatorLanguages() ?? "US";
}

type BookingPhoneInputProps = {
  id?: string;
  value: string;
  onChange: (e164: string) => void;
  disabled?: boolean;
  error?: boolean;
  placeholder?: string;
  className?: string;
};

/**
 * E.164 phone field with country selector. Mounts after layout so `defaultCountry` matches detection on first paint.
 */
export function BookingPhoneInput({
  id,
  value,
  onChange,
  disabled,
  error,
  placeholder = "Phone number",
  className,
}: BookingPhoneInputProps) {
  /** null = not measured yet (avoid mounting PhoneInput with wrong defaultCountry). */
  const [detectedCountry, setDetectedCountry] = useState<Country | null>(null);

  useLayoutEffect(() => {
    setDetectedCountry(guessDefaultCountry());
  }, []);

  const shellClass = cn(
    "flex h-10 w-full items-stretch rounded-md border bg-background shadow-sm transition-colors",
    "focus-within:outline-none focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 focus-within:ring-offset-background",
    error ? "border-destructive" : "border-input",
    disabled && "pointer-events-none cursor-not-allowed opacity-50",
    className
  );

  if (detectedCountry === null) {
    return (
      <div className={shellClass} aria-busy="true">
        <span className="sr-only">Detecting country from your time zone</span>
        <div className="flex flex-1 items-center px-3 text-sm text-muted-foreground">
          Using your time zone…
        </div>
      </div>
    );
  }

  return (
    <div className={shellClass}>
      <PhoneInput
        id={id}
        international
        defaultCountry={detectedCountry}
        countryCallingCodeEditable={false}
        limitMaxLength
        placeholder={placeholder}
        value={(value || undefined) as Value | undefined}
        onChange={(v) => onChange(typeof v === "string" ? v : "")}
        disabled={disabled}
        className={cn(
          "PhoneInput !flex h-full w-full min-w-0 items-center gap-1 px-2 py-0",
          "[&_.PhoneInputCountry]:shrink-0",
          "[&_.PhoneInputCountrySelect]:h-9 [&_.PhoneInputCountrySelect]:max-w-[4.25rem] [&_.PhoneInputCountrySelect]:rounded-md [&_.PhoneInputCountrySelect]:border-0 [&_.PhoneInputCountrySelect]:bg-muted/40 [&_.PhoneInputCountrySelect]:text-sm",
          "[&_.PhoneInputInput]:h-9 [&_.PhoneInputInput]:min-w-0 [&_.PhoneInputInput]:flex-1 [&_.PhoneInputInput]:border-0 [&_.PhoneInputInput]:bg-transparent [&_.PhoneInputInput]:p-0 [&_.PhoneInputInput]:text-sm [&_.PhoneInputInput]:shadow-none [&_.PhoneInputInput]:outline-none [&_.PhoneInputInput]:ring-0",
          "[&_.PhoneInputInput]:placeholder:text-muted-foreground"
        )}
      />
    </div>
  );
}
