import {
  FORM1_DEFAULT_ALL_FREQUENCY_NAMES,
  FORM1_SEEDED_SERVICE_CATEGORIES,
} from "@/lib/form1DefaultServiceCategoryConfig";

const PRESET_CARD_IMAGE =
  "https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=400&h=300&fit=crop";

export type Form1PresetServiceCard = {
  id: string;
  name: string;
  customerDisplayName: string;
  description: string;
  price: number;
  duration: string;
  image: string;
  features: string[];
  raw: Record<string, unknown>;
};

/** Same labels as the seeded Form 1 starter template (`seedForm1IndustryTemplate`). */
export function form1PresetFrequencyLabels(): readonly string[] {
  return FORM1_DEFAULT_ALL_FREQUENCY_NAMES;
}

/**
 * Customer-facing service cards matching the default Form 1 seed (cleaning-style).
 * Used when the tenant has no `industry_service_category` rows yet so book-now still shows the expected layout.
 * Bookings are blocked until real categories exist (`_form1PresetCatalog` guard).
 */
export function buildForm1CustomerFacingPresetServiceCards(): Form1PresetServiceCard[] {
  return FORM1_SEEDED_SERVICE_CATEGORIES.filter((c) => c.display === "customer_frontend_backend_admin").map(
    (c) => ({
      id: `form1-preset-${c.key}`,
      name: c.name,
      customerDisplayName: c.name,
      description: `Professional ${c.name} service.`,
      price: 0,
      duration: "—",
      image: PRESET_CARD_IMAGE,
      features: [] as string[],
      raw: {
        service_category_frequency: false,
        _form1PresetCatalog: true,
        presetKey: c.key,
      },
    }),
  );
}

export function isForm1PresetCatalogService(raw: unknown): boolean {
  return Boolean(raw && typeof raw === "object" && (raw as { _form1PresetCatalog?: boolean })._form1PresetCatalog);
}
