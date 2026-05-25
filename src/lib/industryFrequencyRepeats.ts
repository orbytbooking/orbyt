import type { SupabaseClient } from '@supabase/supabase-js';

/** Normalize labels so "Every Monday & Friday" matches "Every Monday and Friday" for DB lookup. */
export function normalizeFrequencyLabelForMatch(s: string): string {
  return s
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/&/g, ' and ')
    .replace(/\s+and\s+/g, ' and ')
    .replace(/[^a-z0-9 ]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Resolve `frequency_repeats` (kebab-case, see recurringBookings) for a booking label.
 * Uses business + industry scope and falls back to normalized name matching when ilike fails.
 */
export async function resolveFrequencyRepeatsForBooking(
  supabase: SupabaseClient,
  businessId: string,
  industryId: string,
  frequencyLabel: string
): Promise<string | null> {
  const label = frequencyLabel.trim();
  if (!label) return null;

  const { data: exact } = await supabase
    .from('industry_frequency')
    .select('frequency_repeats')
    .eq('business_id', businessId)
    .eq('industry_id', industryId)
    .eq('is_active', true)
    .ilike('name', label)
    .maybeSingle();

  const exactRep = (exact as { frequency_repeats?: string } | null)?.frequency_repeats;
  if (exactRep != null && String(exactRep).trim()) return String(exactRep).trim();

  const target = normalizeFrequencyLabelForMatch(label);
  if (!target) return null;

  const { data: rows } = await supabase
    .from('industry_frequency')
    .select('name, frequency_repeats')
    .eq('business_id', businessId)
    .eq('industry_id', industryId)
    .eq('is_active', true);

  for (const row of rows || []) {
    const n = row?.name;
    const rep = row?.frequency_repeats;
    if (typeof n !== 'string' || rep == null || !String(rep).trim()) continue;
    if (normalizeFrequencyLabelForMatch(n) === target) return String(rep).trim();
  }
  return null;
}

/** Same display as admin booking summary (kebab-case → title-style words). */
export function formatFrequencyRepeatsForDisplay(raw: string | null | undefined): string {
  const s = (raw ?? '').trim();
  if (!s) return '';
  return s.replace(/-/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
}
