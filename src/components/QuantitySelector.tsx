import React from 'react';
import { Button } from '@/components/ui/button';
import { Minus, Plus, Info } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  bookingFormPresetIconTextClass,
  bookingFormPresetRichIconSrc,
  DEFAULT_INDUSTRY_EXTRA_ICON_SRC,
  industryFormIconIsImageSrc,
  resolveCustomerExcludeParameterLineIcon,
  resolveIndustryExtraPresetLucideIcon,
} from '@/lib/industryExtraIcons';

interface QuantitySelectorProps {
  extra: string;
  /** Shown next to controls; booking storage still uses `extra` (canonical name). */
  displayLabel?: string;
  tooltipText?: string;
  /** Form 1 icon: preset key, upload URL, or `/path` — same as industry extras / exclude parameters. */
  icon?: string | null;
  /**
   * `extra` — preset → Lucide or default orbit image (matches book-now extras).
   * `exclude` — preset/label hints → Lucide (matches admin exclude tiles).
   */
  iconKind?: 'extra' | 'exclude';
  /** When true, omit icon + bordered row (legacy `ServiceCard` hardcoded extras). */
  hideIcon?: boolean;
  quantity: number;
  onQuantityChange: (extra: string, quantity: number) => void;
  min?: number;
  max?: number;
}

function BookingLineIcon({
  icon,
  iconKind,
  labelHint,
}: {
  icon?: string | null;
  iconKind: 'extra' | 'exclude';
  labelHint: string;
}) {
  const hint = labelHint.trim();
  if (icon && industryFormIconIsImageSrc(icon)) {
    return (
      <img src={icon} alt="" width={36} height={36} className="h-9 w-9 object-contain" loading="lazy" />
    );
  }
  const richSrc = bookingFormPresetRichIconSrc(icon, hint);
  if (richSrc) {
    return (
      <img
        src={richSrc}
        alt=""
        width={36}
        height={36}
        className="h-9 w-9 object-contain drop-shadow-sm"
        loading="lazy"
      />
    );
  }
  if (iconKind === 'exclude') {
    const resolved = resolveCustomerExcludeParameterLineIcon(icon, hint);
    if (resolved.type === 'image') {
      return (
        <img
          src={resolved.src}
          alt=""
          width={36}
          height={36}
          className="h-9 w-9 object-contain"
          loading="lazy"
        />
      );
    }
    const Lucide = resolved.Icon;
    const colorClass = bookingFormPresetIconTextClass(icon, hint);
    return <Lucide className={`h-9 w-9 shrink-0 ${colorClass}`} aria-hidden />;
  }
  const Preset = resolveIndustryExtraPresetLucideIcon(icon);
  if (Preset) {
    const colorClass = bookingFormPresetIconTextClass(icon, hint);
    return <Preset className={`h-9 w-9 shrink-0 ${colorClass}`} aria-hidden />;
  }
  return (
    <img
      src={DEFAULT_INDUSTRY_EXTRA_ICON_SRC}
      alt=""
      width={36}
      height={36}
      className="h-9 w-9 object-contain"
      loading="lazy"
    />
  );
}

export default function QuantitySelector({
  extra,
  displayLabel,
  tooltipText,
  icon,
  iconKind = 'extra',
  hideIcon = false,
  quantity,
  onQuantityChange,
  min = 0,
  max = 10,
}: QuantitySelectorProps) {
  const handleDecrease = () => {
    if (quantity > min) {
      onQuantityChange(extra, quantity - 1);
    }
  };

  const handleIncrease = () => {
    if (quantity < max) {
      onQuantityChange(extra, quantity + 1);
    }
  };

  const labelForHint = displayLabel ?? extra;

  if (hideIcon) {
    return (
      <div className="flex items-center space-x-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleDecrease}
          disabled={quantity <= min}
          className="h-8 w-8 p-0"
        >
          <Minus className="h-3 w-3" />
        </Button>
        <span className="w-8 text-center text-sm font-medium">{quantity}</span>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleIncrease}
          disabled={quantity >= max}
          className="h-8 w-8 p-0"
        >
          <Plus className="h-3 w-3" />
        </Button>
        <div className="flex min-w-0 items-center gap-1.5">
          <label className="truncate text-sm font-medium leading-none">{displayLabel ?? extra}</label>
          {tooltipText?.trim() ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  className="inline-flex shrink-0 rounded-sm text-orange-500 hover:text-orange-600 focus:outline-none"
                  aria-label={`About ${displayLabel ?? extra}`}
                >
                  <Info className="h-3.5 w-3.5" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-xs text-sm">
                {tooltipText.trim()}
              </TooltipContent>
            </Tooltip>
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white/90 px-2 py-1.5 shadow-sm">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-md bg-slate-50">
        <BookingLineIcon icon={icon} iconKind={iconKind} labelHint={labelForHint} />
      </div>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={handleDecrease}
        disabled={quantity <= min}
        className="h-8 w-8 shrink-0 p-0"
      >
        <Minus className="h-3 w-3" />
      </Button>
      <span className="w-8 shrink-0 text-center text-sm font-medium">{quantity}</span>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={handleIncrease}
        disabled={quantity >= max}
        className="h-8 w-8 shrink-0 p-0"
      >
        <Plus className="h-3 w-3" />
      </Button>
      <div className="flex min-w-0 flex-1 items-center gap-1.5">
        <label className="truncate text-sm font-medium leading-none">
          {displayLabel ?? extra}
        </label>
        {tooltipText?.trim() ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                className="inline-flex shrink-0 rounded-sm text-orange-500 hover:text-orange-600 focus:outline-none"
                aria-label={`About ${displayLabel ?? extra}`}
              >
                <Info className="h-3.5 w-3.5" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-xs text-sm">
              {tooltipText.trim()}
            </TooltipContent>
          </Tooltip>
        ) : null}
      </div>
    </div>
  );
}
