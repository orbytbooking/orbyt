"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import {
  bookingFormPresetIconTextClass,
  industryFormIconIsImageSrc,
  resolveIndustryFormLucideIcon,
} from "@/lib/industryExtraIcons";

export type IndustryFormPresetIconProps = {
  icon?: string | null;
  /** Package/extra display name — used when icon is empty to infer default preset. */
  labelHint?: string | null;
  className?: string;
  iconClassName?: string;
  /** Booking package card: soft plate behind the Lucide icon (matches carousel cards). */
  framed?: boolean;
};

/**
 * Renders the same preset Lucide + color (or custom upload) on admin pickers and booking UI.
 * Preset keys from {@link INDUSTRY_FORM_ICON_PRESETS} — not the separate rich SVG illustrations.
 */
export function IndustryFormPresetIcon({
  icon,
  labelHint,
  className,
  iconClassName = "h-14 w-14",
  framed = false,
}: IndustryFormPresetIconProps) {
  const [imgFailed, setImgFailed] = useState(false);
  const raw = String(icon ?? "").trim();
  const isUpload = Boolean(raw && industryFormIconIsImageSrc(raw));

  if (isUpload && !imgFailed) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={raw}
        alt=""
        className={cn(
          framed ? "h-24 w-full max-w-[180px] rounded-lg object-contain" : "object-contain",
          iconClassName,
          className,
        )}
        onError={() => setImgFailed(true)}
      />
    );
  }

  const PresetIcon = resolveIndustryFormLucideIcon(icon, labelHint);
  const colorClass = bookingFormPresetIconTextClass(icon, labelHint);
  const lucide = (
    <PresetIcon className={cn(iconClassName, colorClass)} strokeWidth={1.25} aria-hidden />
  );

  if (framed) {
    return (
      <div
        className={cn(
          "flex h-28 w-full max-w-[180px] items-center justify-center rounded-xl bg-gradient-to-b from-cyan-50 to-slate-50 dark:from-cyan-950/40 dark:to-slate-900/60",
          className,
        )}
      >
        {lucide}
      </div>
    );
  }

  return <span className={cn("inline-flex shrink-0 items-center justify-center", className)}>{lucide}</span>;
}

/** Selected state for admin icon grid — cyan ring; icon keeps its preset color. */
export function industryFormIconPickerButtonClass(isSelected: boolean): string {
  return cn(
    "h-11 w-11 border-slate-200 bg-white hover:bg-slate-50 dark:border-slate-600 dark:bg-card dark:hover:bg-slate-800",
    isSelected && "border-cyan-500 bg-cyan-50 ring-2 ring-cyan-500/30 dark:bg-cyan-950/30",
  );
}
