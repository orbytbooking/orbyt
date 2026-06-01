export function extractLast4(cardNumber: string): string | null {
  const digits = cardNumber.replace(/\D/g, "");
  return digits.length >= 4 ? digits.slice(-4) : null;
}

export function getCardNumberDigits(cardNumber: string): string {
  return cardNumber.replace(/\D/g, "");
}

export function getMaxCardNumberLength(digits: string): number {
  if (/^3[47]/.test(digits)) return 15;
  return 16;
}

export function getMaxCvcLength(digits: string): number {
  return /^3[47]/.test(digits) ? 4 : 3;
}

export function formatCardNumberForDisplay(digits: string): string {
  const d = digits.replace(/\D/g, "");
  if (/^3[47]/.test(d)) {
    const p1 = d.slice(0, 4);
    const p2 = d.slice(4, 10);
    const p3 = d.slice(10, 15);
    return [p1, p2, p3].filter(Boolean).join(" ");
  }
  return d.replace(/(\d{4})(?=\d)/g, "$1 ").trim();
}

export function sanitizeCardNumberInput(raw: string): string {
  const digits = raw.replace(/\D/g, "").slice(0, getMaxCardNumberLength(raw.replace(/\D/g, "")));
  return formatCardNumberForDisplay(digits);
}

export function sanitizeExpMonthInput(raw: string): string {
  const digits = raw.replace(/\D/g, "").slice(0, 2);
  if (!digits) return "";
  if (digits.length === 1) {
    const n = parseInt(digits, 10);
    if (n === 0) return "0";
    if (n > 1) return `0${n}`;
    return digits;
  }
  const n = parseInt(digits, 10);
  if (n < 1) return "01";
  if (n > 12) return "12";
  return digits.padStart(2, "0");
}

/** Pad single-digit months on blur (e.g. "1" → "01"). */
export function finalizeExpMonthInput(raw: string): string {
  const sanitized = sanitizeExpMonthInput(raw);
  if (!sanitized) return "";
  if (sanitized.length === 1) return `0${sanitized}`;
  return sanitized;
}

export function sanitizeExpYearInput(raw: string): string {
  return raw.replace(/\D/g, "").slice(0, 4);
}

export function sanitizeCvcInput(raw: string, cardNumberDigits: string): string {
  const max = getMaxCvcLength(cardNumberDigits);
  return raw.replace(/\D/g, "").slice(0, max);
}

export function passesLuhnCheck(cardNumber: string): boolean {
  const digits = getCardNumberDigits(cardNumber);
  if (digits.length < 13) return false;
  let sum = 0;
  let shouldDouble = false;
  for (let i = digits.length - 1; i >= 0; i -= 1) {
    let digit = parseInt(digits[i]!, 10);
    if (shouldDouble) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    sum += digit;
    shouldDouble = !shouldDouble;
  }
  return sum % 10 === 0;
}

export function isCardExpirationValid(expMonth: string, expYear: string): boolean {
  const parsed = parseExpMonthYear(expMonth, expYear);
  if (parsed.error || parsed.expMonth == null || parsed.expYear == null) return false;

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;
  if (parsed.expYear < currentYear) return false;
  if (parsed.expYear === currentYear && parsed.expMonth < currentMonth) return false;
  return true;
}

export type CardFormValidation = {
  valid: boolean;
  cardNumberError?: string;
  expMonthError?: string;
  expYearError?: string;
  cvcError?: string;
};

export function validateCardFormInput(params: {
  cardNumber: string;
  expMonth: string;
  expYear: string;
  cardCode: string;
}): CardFormValidation {
  const digits = getCardNumberDigits(params.cardNumber);
  const maxLen = getMaxCardNumberLength(digits);

  if (!digits) {
    return { valid: false, cardNumberError: "Enter a card number." };
  }
  if (digits.length !== maxLen) {
    return { valid: false, cardNumberError: `Enter all ${maxLen} digits of the card number.` };
  }
  if (!passesLuhnCheck(digits)) {
    return { valid: false, cardNumberError: "Enter a valid card number." };
  }

  const month = sanitizeExpMonthInput(params.expMonth);
  if (!/^(0[1-9]|1[0-2])$/.test(month)) {
    return { valid: false, expMonthError: "Enter a valid month (01–12)." };
  }

  const yearDigits = sanitizeExpYearInput(params.expYear);
  if (yearDigits.length !== 2 && yearDigits.length !== 4) {
    return { valid: false, expYearError: "Enter a 2- or 4-digit year." };
  }
  if (!isCardExpirationValid(month, yearDigits)) {
    return { valid: false, expYearError: "Card expiration must be in the future." };
  }

  const cvc = sanitizeCvcInput(params.cardCode, digits);
  const cvcLen = getMaxCvcLength(digits);
  if (cvc.length !== cvcLen) {
    return { valid: false, cvcError: `Enter the ${cvcLen}-digit security code.` };
  }

  return { valid: true };
}

export function detectCardBrandFromNumber(cardNumber: string): string {
  const digits = cardNumber.replace(/\D/g, "");
  if (!digits) return "Card";
  if (/^4/.test(digits)) return "Visa";
  if (/^5[1-5]/.test(digits) || /^2[2-7]/.test(digits)) return "Mastercard";
  if (/^3[47]/.test(digits)) return "Amex";
  if (/^6(?:011|5)/.test(digits)) return "Discover";
  if (/^3(?:0[0-5]|[68])/.test(digits)) return "Diners";
  if (/^35/.test(digits)) return "JCB";
  return "Card";
}

export function parseExpMonthYear(
  expMonth: unknown,
  expYear: unknown
): { expMonth: number | null; expYear: number | null; error?: string } {
  const mo = typeof expMonth === "number" ? expMonth : parseInt(String(expMonth ?? "").trim(), 10);
  let yr = typeof expYear === "number" ? expYear : parseInt(String(expYear ?? "").trim(), 10);
  if (!Number.isFinite(mo) || mo < 1 || mo > 12) {
    return { expMonth: null, expYear: null, error: "Enter a valid expiration month (1-12)." };
  }
  if (!Number.isFinite(yr)) {
    return { expMonth: null, expYear: null, error: "Enter a valid expiration year." };
  }
  if (yr < 100) yr += 2000;
  if (yr < 2000 || yr > 2100) {
    return { expMonth: null, expYear: null, error: "Enter a valid expiration year." };
  }
  return { expMonth: mo, expYear: yr };
}
