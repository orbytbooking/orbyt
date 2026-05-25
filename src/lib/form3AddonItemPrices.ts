/** Per-item S.A. / M.L. pricing for Form 3 add-ons (stored in `item_prices` jsonb). */

export type Form3AddonItemPriceRow = {
  price: string;
  priceMerchant: string;
  timeHours: string;
  timeMinutes: string;
  hoursMerchant: string;
  minutesMerchant: string;
};

export type Form3AddonItemPriceDb = {
  price: number;
  time_minutes: number;
  price_merchant_location?: number | null;
  time_minutes_merchant_location?: number | null;
};

export type Form3AddonItemPriceDbEntry =
  | Form3AddonItemPriceDb
  | { manual_tiers: Form3AddonItemPriceDb[] };

export type Form3ItemCatalogMeta = {
  qtyBased: boolean;
  maximumQuantity: number;
};

/** Per item name → one row (multiply) or N rows (manual, N = item max quantity). */
export type Form3AddonItemPricesByItem = Record<string, Form3AddonItemPriceRow[]>;

export function defaultForm3AddonItemPriceRow(): Form3AddonItemPriceRow {
  return {
    price: "0",
    priceMerchant: "",
    timeHours: "0",
    timeMinutes: "0",
    hoursMerchant: "",
    minutesMerchant: "",
  };
}

/** How many S.A./M.L. tier rows to show for an item in manual pricing mode. */
export function form3ItemManualTierCount(meta: Form3ItemCatalogMeta | undefined): number {
  if (!meta?.qtyBased) return 1;
  const max = Number(meta.maximumQuantity) || 0;
  return max > 0 ? max : 1;
}

export function reconcileForm3AddonItemPrices(
  selectedItemNames: string[],
  current: Form3AddonItemPricesByItem,
  options: {
    manualMode: boolean;
    itemCatalog: Record<string, Form3ItemCatalogMeta>;
  },
): Form3AddonItemPricesByItem {
  const next: Form3AddonItemPricesByItem = {};
  for (const name of selectedItemNames) {
    const tierCount = options.manualMode
      ? form3ItemManualTierCount(options.itemCatalog[name])
      : 1;
    const prev = current[name] ?? [];
    const rows: Form3AddonItemPriceRow[] = [];
    for (let i = 0; i < tierCount; i++) {
      rows.push(prev[i] ? { ...prev[i] } : defaultForm3AddonItemPriceRow());
    }
    next[name] = rows;
  }
  return next;
}

export function rowToDb(row: Form3AddonItemPriceRow): Form3AddonItemPriceDb {
  const hours = Number(row.timeHours) || 0;
  const minutes = Number(row.timeMinutes) || 0;
  const mlHours = Number(row.hoursMerchant) || 0;
  const mlMinutes = Number(row.minutesMerchant) || 0;
  const hasMlPrice = row.priceMerchant.trim() !== "";
  const hasMlTime = Boolean(row.hoursMerchant.trim() || row.minutesMerchant.trim());

  return {
    price: Number(row.price) || 0,
    time_minutes: hours * 60 + minutes,
    price_merchant_location: hasMlPrice ? Number(row.priceMerchant) : null,
    time_minutes_merchant_location: hasMlTime ? mlHours * 60 + mlMinutes : null,
  };
}

export function dbToRow(entry: Form3AddonItemPriceDb | null | undefined): Form3AddonItemPriceRow {
  if (!entry) return defaultForm3AddonItemPriceRow();
  const tm = Number(entry.time_minutes) || 0;
  const mlTm =
    entry.time_minutes_merchant_location != null
      ? Number(entry.time_minutes_merchant_location)
      : null;
  return {
    price: String(entry.price ?? 0),
    priceMerchant:
      entry.price_merchant_location != null ? String(entry.price_merchant_location) : "",
    timeHours: String(Math.floor(tm / 60)),
    timeMinutes: String(tm % 60),
    hoursMerchant: mlTm != null ? String(Math.floor(mlTm / 60)) : "",
    minutesMerchant: mlTm != null ? String(mlTm % 60) : "",
  };
}

function parseDbEntry(raw: unknown): Form3AddonItemPriceRow[] {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return [defaultForm3AddonItemPriceRow()];
  }
  const o = raw as Record<string, unknown>;
  if (Array.isArray(o.manual_tiers)) {
    const tiers = o.manual_tiers
      .filter((t) => t && typeof t === "object" && !Array.isArray(t))
      .map((t) => dbToRow(t as Form3AddonItemPriceDb));
    return tiers.length > 0 ? tiers : [defaultForm3AddonItemPriceRow()];
  }
  return [dbToRow(o as Form3AddonItemPriceDb)];
}

export function serializeForm3AddonItemPrices(
  itemPrices: Form3AddonItemPricesByItem,
  selectedItemNames: string[],
  manualMode: boolean,
): Record<string, Form3AddonItemPriceDbEntry> {
  const out: Record<string, Form3AddonItemPriceDbEntry> = {};
  for (const name of selectedItemNames) {
    const rows = itemPrices[name]?.length
      ? itemPrices[name]
      : [defaultForm3AddonItemPriceRow()];
    if (manualMode) {
      out[name] = { manual_tiers: rows.map(rowToDb) };
    } else {
      out[name] = rowToDb(rows[0] ?? defaultForm3AddonItemPriceRow());
    }
  }
  return out;
}

export function parseForm3AddonItemPrices(
  raw: unknown,
  selectedItemNames: string[],
  legacy?: Form3AddonItemPriceRow,
  options?: {
    manualMode?: boolean;
    itemCatalog?: Record<string, Form3ItemCatalogMeta>;
  },
): Form3AddonItemPricesByItem {
  const parsed: Form3AddonItemPricesByItem = {};
  if (raw && typeof raw === "object" && !Array.isArray(raw)) {
    for (const [key, val] of Object.entries(raw as Record<string, unknown>)) {
      parsed[key] = parseDbEntry(val);
    }
  }
  if (selectedItemNames.length === 0) return parsed;

  const manualMode = options?.manualMode ?? false;
  const itemCatalog = options?.itemCatalog ?? {};
  const reconciled = reconcileForm3AddonItemPrices(selectedItemNames, parsed, {
    manualMode,
    itemCatalog,
  });

  const first = selectedItemNames[0];
  if (legacy && first && !parsed[first]?.length) {
    reconciled[first] = [{ ...legacy }];
  }
  return reconciled;
}

/** Use first tier of first selected item (or legacy top-level fields) for aggregate columns. */
export function primaryForm3AddonItemRow(
  itemPrices: Form3AddonItemPricesByItem,
  selectedItemNames: string[],
  legacy?: Form3AddonItemPriceRow,
): Form3AddonItemPriceRow {
  const first = selectedItemNames[0];
  if (first && itemPrices[first]?.[0]) return itemPrices[first][0];
  return legacy ?? defaultForm3AddonItemPriceRow();
}

/** Migrate legacy single-row map to tier arrays. */
export function normalizeForm3AddonItemPricesMap(
  map: Record<string, Form3AddonItemPriceRow | Form3AddonItemPriceRow[]>,
): Form3AddonItemPricesByItem {
  const out: Form3AddonItemPricesByItem = {};
  for (const [key, val] of Object.entries(map)) {
    out[key] = Array.isArray(val) ? val : [val];
  }
  return out;
}
