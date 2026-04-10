"use client";

import { useLayoutEffect, useRef, useState } from "react";
import PhoneInput, { type Value } from "react-phone-number-input";
import "react-phone-number-input/style.css";
import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";
import { guessDefaultCountry } from "@/lib/phoneDefaultCountry";
import { toPhoneInputValue } from "@/lib/phoneE164";

export const PHONE_FIELD_HELPER_TEXT =
  "Default country follows your device time zone (then language if needed). Change it with the flag dropdown anytime.";

export type PhoneFieldProps = {
  id?: string;
  label?: string;
  /** Use with FormItem + FormLabel so the label is not duplicated */
  hideLabel?: boolean;
  value: string;
  onChange: (e164: string) => void;
  onBlur?: () => void;
  disabled?: boolean;
  error?: boolean;
  placeholder?: string;
  className?: string;
  /** Outer wrapper (label + field + helper) */
  containerClassName?: string;
  labelClassName?: string;
  showHelperText?: boolean;
  helperText?: string;
  descriptionClassName?: string;
};

export function PhoneField({
  id,
  label = "Phone number",
  hideLabel = false,
  value,
  onChange,
  onBlur,
  disabled,
  error,
  placeholder = "Phone number",
  className,
  containerClassName,
  labelClassName,
  showHelperText = true,
  helperText = PHONE_FIELD_HELPER_TEXT,
  descriptionClassName,
}: PhoneFieldProps) {
  const [detectedCountry, setDetectedCountry] = useState<ReturnType<typeof guessDefaultCountry> | null>(null);
  const migratedFromRef = useRef<string | null>(null);

  useLayoutEffect(() => {
    setDetectedCountry(guessDefaultCountry());
  }, []);

  /** Migrate legacy national / messy DB values to E.164 before paint so controlled input stays valid. */
  useLayoutEffect(() => {
    if (detectedCountry === null) return;
    const raw = String(value ?? "").trim();
    if (!raw) {
      migratedFromRef.current = null;
      return;
    }
    const safe = toPhoneInputValue(value, detectedCountry);
    if (!safe || safe === raw) {
      migratedFromRef.current = null;
      return;
    }
    if (migratedFromRef.current === raw) return;
    migratedFromRef.current = raw;
    onChange(safe);
  }, [detectedCountry, value, onChange]);

  const phoneInputValue =
    detectedCountry === null ? undefined : (toPhoneInputValue(value, detectedCountry) as Value | undefined);

  const shellClass = cn(
    "flex h-10 w-full items-stretch rounded-md border bg-background shadow-sm transition-colors",
    "focus-within:outline-none focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 focus-within:ring-offset-background",
    error ? "border-destructive" : "border-input",
    disabled && "pointer-events-none cursor-not-allowed opacity-50",
    className
  );

  const inputBlock =
    detectedCountry === null ? (
      <div className={shellClass} aria-busy="true">
        <span className="sr-only">Detecting country from your time zone</span>
        <div className="flex flex-1 items-center px-3 text-sm text-muted-foreground">Using your time zone…</div>
      </div>
    ) : (
      <div className={shellClass}>
        <PhoneInput
          id={id}
          international
          defaultCountry={detectedCountry}
          countryCallingCodeEditable={false}
          limitMaxLength
          placeholder={placeholder}
          value={phoneInputValue}
          onChange={(v) => onChange(typeof v === "string" ? v : "")}
          onBlur={onBlur}
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

  return (
    <div className={cn("space-y-1.5", containerClassName)}>
      {!hideLabel && label ? (
        <Label htmlFor={id} className={cn(labelClassName)}>
          {label}
        </Label>
      ) : null}
      {inputBlock}
      {showHelperText && helperText ? (
        <p className={cn("text-xs text-muted-foreground", descriptionClassName)}>{helperText}</p>
      ) : null}
    </div>
  );
}
