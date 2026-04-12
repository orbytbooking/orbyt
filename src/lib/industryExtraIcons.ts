import type { LucideIcon } from "lucide-react";
import {
  Armchair,
  Bath,
  Bed,
  Blinds,
  Box,
  CookingPot,
  Droplets,
  Eraser,
  Flame,
  Flower2,
  Hammer,
  Paintbrush,
  Ruler,
  Shirt,
  Sofa,
  Sparkles,
  Sparkle,
  Trash2,
  UtensilsCrossed,
  Warehouse,
  Wind,
} from "lucide-react";

/**
 * Single source of truth for Form 1 “Select icon” grids (extras, exclude parameters)
 * and booking-form icon resolution. Keep `value` stable — it is stored in the database.
 */
export const INDUSTRY_FORM_ICON_PRESETS: ReadonlyArray<{
  name: string;
  value: string;
  Icon: LucideIcon;
}> = [
  { name: "Laundry", value: "laundry", Icon: Shirt },
  { name: "Furniture", value: "furniture", Icon: Sofa },
  { name: "Bedroom", value: "bedroom", Icon: Bed },
  { name: "Bathroom", value: "bathroom", Icon: Bath },
  { name: "Kitchen", value: "kitchen", Icon: UtensilsCrossed },
  { name: "Living room", value: "living_room", Icon: Armchair },
  { name: "Water/Mold", value: "water", Icon: Droplets },
  { name: "Odor", value: "odor", Icon: Wind },
  { name: "Trash/Clutter", value: "trash", Icon: Trash2 },
  { name: "Garden/Plants", value: "plants", Icon: Flower2 },
  { name: "Fire Damage", value: "fire", Icon: Flame },
  { name: "Storage", value: "storage", Icon: Warehouse },
  { name: "Paint Removal", value: "paint", Icon: Paintbrush },
  { name: "Windows / blinds", value: "blinds", Icon: Blinds },
  { name: "Fridge / inside", value: "fridge", Icon: Box },
  { name: "Oven / appliance", value: "oven", Icon: CookingPot },
  { name: "Paint prep / strip", value: "eraser", Icon: Eraser },
  { name: "Heavy duty", value: "heavy_duty", Icon: Hammer },
  { name: "Baseboards / trim", value: "baseboards", Icon: Ruler },
  { name: "Touch-up clean", value: "sparkle", Icon: Sparkle },
  { name: "General / other", value: "other", Icon: Sparkles },
];

const LUCIDE_BY_PRESET_KEY: Record<string, LucideIcon> = Object.fromEntries(
  INDUSTRY_FORM_ICON_PRESETS.map((p) => [p.value, p.Icon]),
) as Record<string, LucideIcon>;

/** Map alternate stored keys → canonical preset `value`. */
const KEY_ALIASES: Record<string, string> = {
  livingroom: "living_room",
  "living-room": "living_room",
  paint_removal: "paint",
  water_mold: "water",
  trash_clutter: "trash",
  garden_plants: "plants",
  fire_damage: "fire",
  inside_fridge: "fridge",
  refrigerator: "fridge",
  paint_strip: "eraser",
  ruler: "baseboards",
  general_clean: "sparkle",
  general: "other",
};

/** True when the value should render as an <img src="…" /> (upload, CDN, or app path). */
export function industryFormIconIsImageSrc(icon: string | null | undefined): boolean {
  const s = String(icon ?? "").trim();
  if (!s) return false;
  const low = s.toLowerCase();
  return (
    low.startsWith("data:") ||
    low.startsWith("http://") ||
    low.startsWith("https://") ||
    low.startsWith("//") ||
    (low.startsWith("/") && low.length > 1)
  );
}

function normalizePresetKey(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_")
    .replace(/_+/g, "_");
}

function lucideFromLabelHint(label: string): LucideIcon | null {
  const n = label.toLowerCase();
  if (/\b(fridge|refrigerat)\b/.test(n)) return Box;
  if (/\boven\b/.test(n)) return CookingPot;
  if (/\bdishes?\b/.test(n)) return UtensilsCrossed;
  if (/\b(blinds?|window)\b/.test(n)) return Blinds;
  if (/\bcabinet\b/.test(n)) return Warehouse;
  if (/\bbaseboard\b/.test(n)) return Ruler;
  if (/\bpaint\b/.test(n) && /\b(remov|strip)\b/.test(n)) return Eraser;
  if (/\bpaint\b/.test(n)) return Paintbrush;
  if (/\bheavy\b/.test(n) && /\bduty\b/.test(n)) return Hammer;
  if (/\b(wet\s*wipe|wipe)\b/.test(n)) return Droplets;
  // Common exclude-parameter / variable labels (before generic "clean" match)
  if (/\b(half\s+|full\s+|master\s+)?bathroom\b|\b(bath|restroom)\b/.test(n)) return Bath;
  if (/\bbedroom\b|\bbed\s+room\b/.test(n)) return Bed;
  if (/\bkitchen\b/.test(n)) return UtensilsCrossed;
  if (/\b(living\s*room|livingroom|family\s*room|den)\b/.test(n)) return Armchair;
  if (/\b(clean|scrub|wash)\b/.test(n)) return Sparkle;
  return null;
}

/** Default extras tile when no preset is selected and no custom upload/URL (`public/images/orbit.png`). */
export const DEFAULT_INDUSTRY_EXTRA_ICON_SRC = "/images/orbit.png";

/**
 * Industry **extras** only: returns a Lucide icon when `icon` matches a Form 1 preset key; otherwise `null`
 * (caller should show `DEFAULT_INDUSTRY_EXTRA_ICON_SRC`). Custom images: caller branches on
 * `industryFormIconIsImageSrc` first.
 */
export function resolveIndustryExtraPresetLucideIcon(icon: string | null | undefined): LucideIcon | null {
  const raw = String(icon ?? "").trim();
  if (!raw || industryFormIconIsImageSrc(raw)) return null;
  let k = normalizePresetKey(raw);
  k = KEY_ALIASES[k] ?? k;
  return LUCIDE_BY_PRESET_KEY[k] ?? null;
}

/**
 * Exclude parameters (and similar): preset key, optional label hint, then default.
 * Use `industryFormIconIsImageSrc` first for URLs.
 */
export function resolveIndustryFormLucideIcon(
  icon: string | null | undefined,
  labelForHint?: string | null,
): LucideIcon {
  const raw = String(icon ?? "").trim();
  if (raw && !industryFormIconIsImageSrc(raw)) {
    let k = normalizePresetKey(raw);
    k = KEY_ALIASES[k] ?? k;
    const hit = LUCIDE_BY_PRESET_KEY[k];
    if (hit) return hit;
  }
  const hint = String(labelForHint ?? "").trim();
  if (hint) {
    const fromName = lucideFromLabelHint(hint);
    if (fromName) return fromName;
  }
  return Sparkles;
}

export type CustomerExcludeLineIconResolved =
  | { type: 'image'; src: string }
  | { type: 'lucide'; Icon: LucideIcon };

/**
 * Customer booking rows (exclude parameters): same presets/uploads as Form 1, label hints, then
 * {@link DEFAULT_INDUSTRY_EXTRA_ICON_SRC} — not the Sparkles Lucide fallback used on some admin tiles.
 */
export function resolveCustomerExcludeParameterLineIcon(
  icon: string | null | undefined,
  displayLabel?: string | null,
): CustomerExcludeLineIconResolved {
  const raw = String(icon ?? "").trim();
  if (raw && industryFormIconIsImageSrc(raw)) {
    return { type: 'image', src: raw };
  }
  const fromPreset = raw ? resolveIndustryExtraPresetLucideIcon(raw) : null;
  if (fromPreset) {
    return { type: 'lucide', Icon: fromPreset };
  }
  const hint = String(displayLabel ?? "").trim();
  if (hint) {
    const fromName = lucideFromLabelHint(hint);
    if (fromName) {
      return { type: 'lucide', Icon: fromName };
    }
  }
  return { type: 'image', src: DEFAULT_INDUSTRY_EXTRA_ICON_SRC };
}
