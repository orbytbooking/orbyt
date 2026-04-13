/**
 * Variable-category selections for booking summary UIs (admin, provider, etc.).
 * Customer book-now persists `variableCategories`; admin flows often use `categoryValues` / `category_values`.
 */

export function formatBookingSummaryCategoryLabel(key: string): string {
  return key
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (s) => s.toUpperCase())
    .replace(/\b(sqft|sq ft|area|size)\b/gi, (m) =>
      /sqft|sq ft/i.test(m) ? "Sq Ft" : m.charAt(0).toUpperCase() + m.slice(1).toLowerCase(),
    );
}

function isMeaningfulSelection(v: unknown): boolean {
  if (v == null) return false;
  const s = String(v).trim();
  if (!s) return false;
  return s.toLowerCase() !== "none";
}

function rowsFromStringMap(map: Record<string, unknown> | null | undefined): { label: string; value: string }[] {
  if (!map || typeof map !== "object" || Array.isArray(map)) return [];
  const out: { label: string; value: string }[] = [];
  for (const [k, v] of Object.entries(map)) {
    if (!isMeaningfulSelection(v)) continue;
    out.push({ label: formatBookingSummaryCategoryLabel(k), value: String(v).trim() });
  }
  return out;
}

function mergedCategoryValueMap(c: Record<string, unknown>): Record<string, unknown> {
  const snake = c.category_values;
  const camel = c.categoryValues;
  const a =
    snake && typeof snake === "object" && !Array.isArray(snake) ? (snake as Record<string, unknown>) : {};
  const b =
    camel && typeof camel === "object" && !Array.isArray(camel) ? (camel as Record<string, unknown>) : {};
  return { ...a, ...b };
}

/**
 * Rows to show in booking detail summaries (matches customer appointments when data is in `variableCategories`).
 */
export function getBookingSummaryVariableRows(
  customization: Record<string, unknown> | null | undefined,
): { label: string; value: string }[] {
  if (!customization || typeof customization !== "object") return [];

  const vc = customization.variableCategories;
  const fromVc =
    vc && typeof vc === "object" && !Array.isArray(vc)
      ? rowsFromStringMap(vc as Record<string, unknown>)
      : [];
  if (fromVc.length > 0) return fromVc;

  const fromCv = rowsFromStringMap(mergedCategoryValueMap(customization));
  if (fromCv.length > 0) return fromCv;

  const rows: { label: string; value: string }[] = [];
  const sq =
    customization.squareMeters ?? customization.sqFt ?? customization.sqft ?? customization["Sq Ft"];
  if (isMeaningfulSelection(sq)) rows.push({ label: "Sq Ft", value: String(sq).trim() });

  const storage = customization.storage ?? customization.Storage;
  if (isMeaningfulSelection(storage)) rows.push({ label: "Storage", value: String(storage).trim() });

  const bed = customization.bedroom ?? customization.bedrooms ?? customization.Bedroom;
  if (isMeaningfulSelection(bed)) rows.push({ label: "Bedroom", value: String(bed).trim() });

  const bath = customization.bathroom ?? customization.bathrooms ?? customization.Bathroom;
  if (isMeaningfulSelection(bath)) rows.push({ label: "Bathroom", value: String(bath).trim() });

  const living =
    customization.livingRoom ?? customization["Living Room"] ?? customization.living_room;
  if (isMeaningfulSelection(living)) rows.push({ label: "Living Room", value: String(living).trim() });

  return rows;
}
