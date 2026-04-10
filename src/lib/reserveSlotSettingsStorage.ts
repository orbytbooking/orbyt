/**
 * Client-side fallback cache for admin Reserve Slot settings.
 * Keys are scoped by business so switching tenant does not read/write another business's data.
 */
export const RESERVE_SLOT_SETTINGS_LEGACY_KEY = 'reserveSlotSettings';

export function reserveSlotSettingsStorageKey(businessId: string | null | undefined): string {
  const id = businessId?.trim();
  if (id) return `${RESERVE_SLOT_SETTINGS_LEGACY_KEY}_${id}`;
  return RESERVE_SLOT_SETTINGS_LEGACY_KEY;
}
