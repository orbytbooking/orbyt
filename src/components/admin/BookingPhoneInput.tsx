"use client";

import { PhoneField, type Country } from "@/components/ui/phone-field";

type BookingPhoneInputProps = {
  id?: string;
  value: string;
  onChange: (e164: string) => void;
  disabled?: boolean;
  error?: boolean;
  placeholder?: string;
  className?: string;
  preferredDefaultCountry?: Country;
};

/**
 * E.164 phone field for admin booking flows (country selector + default country from time zone / language).
 */
export function BookingPhoneInput({
  id,
  value,
  onChange,
  disabled,
  error,
  placeholder = "Phone number",
  className,
  preferredDefaultCountry,
}: BookingPhoneInputProps) {
  return (
    <PhoneField
      id={id}
      hideLabel
      showHelperText={false}
      value={value}
      preferredDefaultCountry={preferredDefaultCountry}
      onChange={onChange}
      disabled={disabled}
      error={error}
      placeholder={placeholder}
      className={className}
      containerClassName="space-y-0"
    />
  );
}
