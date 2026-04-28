export type FunnelStepCellState = { status?: string | null; note?: string | null };
export type FunnelStepStatusesMap = Record<string, FunnelStepCellState>;

export function normalizeFunnelStepStatusesFromDb(raw: unknown): FunnelStepStatusesMap {
  let obj: unknown = raw;
  if (typeof raw === "string") {
    try {
      obj = JSON.parse(raw);
    } catch {
      return {};
    }
  }
  if (!obj || typeof obj !== "object" || Array.isArray(obj)) return {};
  const out: FunnelStepStatusesMap = {};
  for (const [key, val] of Object.entries(obj as Record<string, unknown>)) {
    if (typeof key !== "string" || key.length > 120) continue;
    if (val === null) continue;
    if (typeof val !== "object" || val === null || Array.isArray(val)) continue;
    const v = val as Record<string, unknown>;
    const cell: FunnelStepCellState = {};
    if (v.status === null) cell.status = null;
    else if (typeof v.status === "string") cell.status = v.status.slice(0, 80);
    if (v.note === null) cell.note = null;
    else if (typeof v.note === "string") cell.note = v.note.slice(0, 100_000);
    if (cell.status !== undefined || cell.note !== undefined) out[key] = cell;
  }
  return out;
}

export function mergeFunnelStepStatusesPatch(
  existing: FunnelStepStatusesMap,
  patch: unknown,
): FunnelStepStatusesMap {
  const out: FunnelStepStatusesMap = { ...existing };
  if (!patch || typeof patch !== "object" || Array.isArray(patch)) return out;
  for (const [key, val] of Object.entries(patch as Record<string, unknown>)) {
    if (typeof key !== "string" || key.length > 120) continue;
    if (val === null) {
      delete out[key];
      continue;
    }
    if (typeof val !== "object" || val === null || Array.isArray(val)) continue;
    const prev: FunnelStepCellState = { ...(out[key] ?? {}) };
    const v = val as Record<string, unknown>;
    if (v.status !== undefined) {
      if (v.status === null) delete prev.status;
      else if (typeof v.status === "string") prev.status = v.status.slice(0, 80);
    }
    if (v.note !== undefined) {
      if (v.note === null) delete prev.note;
      else if (typeof v.note === "string") prev.note = v.note.slice(0, 100_000);
    }
    if (Object.keys(prev).length === 0) delete out[key];
    else out[key] = prev;
  }
  return out;
}
