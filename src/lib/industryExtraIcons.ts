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
  Layers,
  Package,
  Paintbrush,
  Ruler,
  Shirt,
  Sofa,
  Sparkles,
  Sparkle,
  Soup,
  ShowerHead,
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
  { name: "Layers", value: "layers", Icon: Layers },
  { name: "Package", value: "package", Icon: Package },
  { name: "Sparkles", value: "sparkles", Icon: Sparkles },
  { name: "Laundry", value: "laundry", Icon: Shirt },
  { name: "Furniture", value: "furniture", Icon: Sofa },
  { name: "Bedroom", value: "bedroom", Icon: Bed },
  { name: "Bathroom", value: "bathroom", Icon: Bath },
  { name: "Full bathroom", value: "full_bathroom", Icon: Bath },
  { name: "Half bathroom", value: "half_bathroom", Icon: ShowerHead },
  { name: "Kitchen", value: "kitchen", Icon: UtensilsCrossed },
  { name: "Dishes", value: "dishes", Icon: Soup },
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

/**
 * Tailwind `text-*` classes for booking tiles (Lucide uses `currentColor` on stroke).
 * One distinct hue per preset so extras / exclude rows read as colored icons.
 */
const BOOKING_PRESET_ICON_TEXT_CLASS: Record<string, string> = Object.fromEntries(
  INDUSTRY_FORM_ICON_PRESETS.map((p) => {
    const colorByValue: Record<string, string> = {
      layers: "text-slate-600",
      package: "text-violet-600",
      sparkles: "text-amber-500",
      laundry: "text-sky-500",
      furniture: "text-amber-600",
      bedroom: "text-violet-600",
      bathroom: "text-cyan-600",
      full_bathroom: "text-cyan-700",
      half_bathroom: "text-sky-600",
      kitchen: "text-orange-600",
      dishes: "text-emerald-600",
      living_room: "text-rose-600",
      water: "text-blue-500",
      odor: "text-slate-500",
      trash: "text-stone-600",
      plants: "text-green-600",
      fire: "text-red-500",
      storage: "text-yellow-700",
      paint: "text-fuchsia-600",
      blinds: "text-indigo-500",
      fridge: "text-cyan-700",
      oven: "text-orange-700",
      eraser: "text-pink-500",
      heavy_duty: "text-neutral-700",
      baseboards: "text-teal-600",
      sparkle: "text-amber-500",
      other: "text-purple-500",
    };
    return [p.value, colorByValue[p.value] ?? "text-slate-600"];
  }),
) as Record<string, string>;

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
  dish: "dishes",
  dishes: "dishes",
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

/** Normalize extra / exclude display names for exact lookup (Form 1 seed names, customer labels). */
function normalizeBookingLabelKey(label: string): string {
  return label
    .trim()
    .toLowerCase()
    .replace(/['\u2019]/g, "")
    .replace(/\s+/g, " ");
}

/**
 * Exact name → preset `value` for Form 1 extras (and common synonyms).
 * Ensures rich SVG + Lucide match the business “extra” row even when heuristics misfire
 * (e.g. “Wet Wipe Window Blinds” must be `blinds`, not `water`).
 */
const BOOKING_PRESET_LABEL_OVERRIDES: Record<string, string> = {
  laundry: "laundry",
  baseboards: "baseboards",
  "paint removal": "paint",
  "heavy duty": "heavy_duty",
  "inside cabinets": "storage",
  "wet wipe window blinds": "blinds",
  "inside fridge": "fridge",
  "inside oven": "oven",
  dishes: "dishes",
  // Form 1 seeded exclude names → same keys as `industry_exclude_parameter.icon`
  bedroom: "bedroom",
  "full bathroom": "full_bathroom",
  "half bathroom": "half_bathroom",
  kitchen: "kitchen",
  "living room": "living_room",
};

/** Canonical preset `value` inferred from a display name (same rules as icon shape). */
export function presetKeyFromLabelHint(label: string): string | null {
  const exact = BOOKING_PRESET_LABEL_OVERRIDES[normalizeBookingLabelKey(label)];
  if (exact) return exact;

  const n = label.toLowerCase();
  if (/\blaundry\b/.test(n)) return "laundry";
  if (/\b(fridge|refrigerat)\b/.test(n)) return "fridge";
  if (/\boven\b/.test(n)) return "oven";
  if (/\bdishes?\b/.test(n)) return "dishes";
  // Blinds before generic "wipe" / "wet wipe" (otherwise "Wet Wipe … Blinds" → water).
  if (/\bblinds?\b/.test(n)) return "blinds";
  if (/\bwindow\b/.test(n) && /\b(blind|shade|shutter)\b/.test(n)) return "blinds";
  if (/\bcabinet\b/.test(n)) return "storage";
  if (/\bbaseboard\b/.test(n)) return "baseboards";
  if (/\bpaint\b/.test(n) && /\b(strip|stripping|prep)\b/.test(n)) return "eraser";
  if (/\bpaint\b/.test(n) && /\b(remov|removal|scrap)\b/.test(n)) return "paint";
  if (/\bpaint\b/.test(n)) return "paint";
  if (/\bheavy\b/.test(n) && /\bduty\b/.test(n)) return "heavy_duty";
  if (/\b(wet\s*wipe|wipe)\b/.test(n)) return "water";
  if (/\bhalf\b/.test(n) && /\b(bathroom|bath)\b/.test(n)) return "half_bathroom";
  if (/\b(full|master)\b/.test(n) && /\b(bathroom|bath)\b/.test(n)) return "full_bathroom";
  if (/\bbathroom\b|\b(bath|restroom)\b/.test(n)) return "bathroom";
  if (/\bbedroom\b|\bbed\s+room\b/.test(n)) return "bedroom";
  if (/\bkitchen\b/.test(n)) return "kitchen";
  if (/\b(living\s*room|livingroom|family\s*room|den)\b/.test(n)) return "living_room";
  if (/\b(clean|scrub|wash)\b/.test(n)) return "sparkle";
  return null;
}

function canonicalPresetKeyFromStoredIcon(icon: string): string | null {
  let k = normalizePresetKey(icon);
  if (!k) return null;
  k = KEY_ALIASES[k] ?? k;
  return LUCIDE_BY_PRESET_KEY[k] ? k : null;
}

/** Canonical Form 1 preset key from stored `icon` and/or display label (for rich assets + fallbacks). */
export function resolveCanonicalBookingPresetKey(
  icon: string | null | undefined,
  labelHint?: string | null,
): string | null {
  const raw = String(icon ?? "").trim();
  const hint = String(labelHint ?? "").trim();
  const fromLabel = hint ? presetKeyFromLabelHint(hint) : null;

  if (raw && !industryFormIconIsImageSrc(raw)) {
    const k = canonicalPresetKeyFromStoredIcon(raw);
    // Legacy rows often store generic `bathroom` for both "Full" and "Half" — use the display name.
    if (k === "bathroom" && (fromLabel === "full_bathroom" || fromLabel === "half_bathroom")) {
      return fromLabel;
    }
    if (k) return k;
  }
  return fromLabel;
}

const BOOKING_PRESET_RICH_ICON_DIR = "/images/booking-presets";

/**
 * Colorful preset illustration (`public/images/booking-presets/{key}.svg`).
 * Custom uploads / URLs: caller handles separately — do not pass those here as `icon`.
 */
export function bookingFormPresetRichIconSrc(
  icon: string | null | undefined,
  labelHint?: string | null,
): string | null {
  const key = resolveCanonicalBookingPresetKey(icon, labelHint);
  if (!key) return null;
  return `${BOOKING_PRESET_RICH_ICON_DIR}/${key}.svg`;
}

/**
 * Tailwind text color class for a booking-line Lucide icon (preset key or label hint).
 * Custom image URLs: caller skips this and renders `<img />` instead.
 */
export function bookingFormPresetIconTextClass(
  icon: string | null | undefined,
  labelHint?: string | null,
): string {
  const key = resolveCanonicalBookingPresetKey(icon, labelHint);
  if (key && BOOKING_PRESET_ICON_TEXT_CLASS[key]) {
    return BOOKING_PRESET_ICON_TEXT_CLASS[key];
  }
  return BOOKING_PRESET_ICON_TEXT_CLASS.other;
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
  const key = resolveCanonicalBookingPresetKey(icon, labelForHint);
  if (key && LUCIDE_BY_PRESET_KEY[key]) {
    return LUCIDE_BY_PRESET_KEY[key];
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
  const key = resolveCanonicalBookingPresetKey(icon, displayLabel);
  if (key && LUCIDE_BY_PRESET_KEY[key]) {
    return { type: 'lucide', Icon: LUCIDE_BY_PRESET_KEY[key] };
  }
  return { type: 'image', src: DEFAULT_INDUSTRY_EXTRA_ICON_SRC };
}
