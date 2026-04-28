import type { SupabaseClient } from "@supabase/supabase-js";

export type HiringGeneralSettings = {
  rejectIfPreviouslyRejected: boolean;
  /** Prospects stuck in `new` or `screening` longer than this are auto-rejected when the prospects list is loaded. */
  autoRejectStaleDays: number;
  autoRejectByQuizScore: boolean;
  quizMinimumScorePercent: number;
  /** When true, "Create Member" moves the prospect to onboarded (`hired`) instead of `interview`. */
  autoOnboardWhenCreateMember: boolean;
  /** Show an extra "New" badge for prospects in stage `new` created within this many days. */
  prospectNewBadgeDays: number;
};

export const DEFAULT_HIRING_GENERAL_SETTINGS: HiringGeneralSettings = {
  rejectIfPreviouslyRejected: true,
  autoRejectStaleDays: 90,
  autoRejectByQuizScore: true,
  quizMinimumScorePercent: 50,
  autoOnboardWhenCreateMember: true,
  prospectNewBadgeDays: 7,
};

export const AUTO_REJECT_STALE_DAY_OPTIONS = [7, 14, 30, 60, 90, 120, 180, 365] as const;
export const PROSPECT_NEW_BADGE_DAY_OPTIONS = [1, 3, 7, 14, 30, 60, 90] as const;

type DbRow = {
  business_id: string;
  reject_if_previously_rejected: boolean;
  auto_reject_stale_days: number;
  auto_reject_by_quiz_score: boolean;
  quiz_minimum_score_percent: number;
  auto_onboard_when_create_member: boolean;
  prospect_new_badge_days: number;
};

export function rowToHiringGeneralSettings(row: Partial<DbRow> | null): HiringGeneralSettings {
  if (!row) return { ...DEFAULT_HIRING_GENERAL_SETTINGS };
  return {
    rejectIfPreviouslyRejected:
      typeof row.reject_if_previously_rejected === "boolean"
        ? row.reject_if_previously_rejected
        : DEFAULT_HIRING_GENERAL_SETTINGS.rejectIfPreviouslyRejected,
    autoRejectStaleDays:
      typeof row.auto_reject_stale_days === "number" && row.auto_reject_stale_days > 0
        ? row.auto_reject_stale_days
        : DEFAULT_HIRING_GENERAL_SETTINGS.autoRejectStaleDays,
    autoRejectByQuizScore:
      typeof row.auto_reject_by_quiz_score === "boolean"
        ? row.auto_reject_by_quiz_score
        : DEFAULT_HIRING_GENERAL_SETTINGS.autoRejectByQuizScore,
    quizMinimumScorePercent:
      typeof row.quiz_minimum_score_percent === "number"
        ? row.quiz_minimum_score_percent
        : DEFAULT_HIRING_GENERAL_SETTINGS.quizMinimumScorePercent,
    autoOnboardWhenCreateMember:
      typeof row.auto_onboard_when_create_member === "boolean"
        ? row.auto_onboard_when_create_member
        : DEFAULT_HIRING_GENERAL_SETTINGS.autoOnboardWhenCreateMember,
    prospectNewBadgeDays:
      typeof row.prospect_new_badge_days === "number" && row.prospect_new_badge_days > 0
        ? row.prospect_new_badge_days
        : DEFAULT_HIRING_GENERAL_SETTINGS.prospectNewBadgeDays,
  };
}

export function hiringGeneralSettingsToDbPatch(s: HiringGeneralSettings): Omit<DbRow, "business_id"> {
  return {
    reject_if_previously_rejected: s.rejectIfPreviouslyRejected,
    auto_reject_stale_days: s.autoRejectStaleDays,
    auto_reject_by_quiz_score: s.autoRejectByQuizScore,
    quiz_minimum_score_percent: s.quizMinimumScorePercent,
    auto_onboard_when_create_member: s.autoOnboardWhenCreateMember,
    prospect_new_badge_days: s.prospectNewBadgeDays,
  };
}

export async function fetchHiringGeneralSettings(
  supabase: SupabaseClient,
  businessId: string,
): Promise<HiringGeneralSettings> {
  const { data, error } = await supabase
    .from("business_hiring_general_settings")
    .select("*")
    .eq("business_id", businessId)
    .maybeSingle();

  if (error) {
    console.error("fetchHiringGeneralSettings:", error.message);
    return { ...DEFAULT_HIRING_GENERAL_SETTINGS };
  }
  return rowToHiringGeneralSettings(data as Partial<DbRow> | null);
}

export async function upsertHiringGeneralSettings(
  supabase: SupabaseClient,
  businessId: string,
  next: HiringGeneralSettings,
): Promise<{ ok: true } | { ok: false; message: string }> {
  const patch = hiringGeneralSettingsToDbPatch(next);
  const now = new Date().toISOString();
  const { data: existing, error: selErr } = await supabase
    .from("business_hiring_general_settings")
    .select("business_id")
    .eq("business_id", businessId)
    .maybeSingle();

  if (selErr) return { ok: false, message: selErr.message };

  if (existing) {
    const { error } = await supabase
      .from("business_hiring_general_settings")
      .update({ ...patch, updated_at: now })
      .eq("business_id", businessId);
    if (error) return { ok: false, message: error.message };
  } else {
    const { error } = await supabase.from("business_hiring_general_settings").insert({
      business_id: businessId,
      ...patch,
      updated_at: now,
    });
    if (error) return { ok: false, message: error.message };
  }
  return { ok: true };
}

function coerceBool(v: unknown, fallback: boolean): boolean {
  if (typeof v === "boolean") return v;
  if (v === "true" || v === "yes" || v === 1) return true;
  if (v === "false" || v === "no" || v === 0) return false;
  return fallback;
}

function coerceInt(v: unknown, fallback: number, min: number, max: number): number {
  const n = typeof v === "number" ? v : typeof v === "string" ? parseInt(v, 10) : NaN;
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, Math.trunc(n)));
}

export function parseHiringGeneralSettingsPatch(
  body: Record<string, unknown>,
  current: HiringGeneralSettings,
): HiringGeneralSettings | { error: string } {
  const next: HiringGeneralSettings = { ...current };

  if ("rejectIfPreviouslyRejected" in body) {
    next.rejectIfPreviouslyRejected = coerceBool(body.rejectIfPreviouslyRejected, current.rejectIfPreviouslyRejected);
  }
  if ("autoRejectStaleDays" in body) {
    const v = coerceInt(body.autoRejectStaleDays, current.autoRejectStaleDays, 1, 3650);
    if (!AUTO_REJECT_STALE_DAY_OPTIONS.includes(v as (typeof AUTO_REJECT_STALE_DAY_OPTIONS)[number])) {
      return { error: `autoRejectStaleDays must be one of: ${AUTO_REJECT_STALE_DAY_OPTIONS.join(", ")}` };
    }
    next.autoRejectStaleDays = v;
  }
  if ("autoRejectByQuizScore" in body) {
    next.autoRejectByQuizScore = coerceBool(body.autoRejectByQuizScore, current.autoRejectByQuizScore);
  }
  if ("quizMinimumScorePercent" in body) {
    next.quizMinimumScorePercent = coerceInt(
      body.quizMinimumScorePercent,
      current.quizMinimumScorePercent,
      0,
      100,
    );
  }
  if ("autoOnboardWhenCreateMember" in body) {
    next.autoOnboardWhenCreateMember = coerceBool(
      body.autoOnboardWhenCreateMember,
      current.autoOnboardWhenCreateMember,
    );
  }
  if ("prospectNewBadgeDays" in body) {
    const v = coerceInt(body.prospectNewBadgeDays, current.prospectNewBadgeDays, 1, 365);
    if (!PROSPECT_NEW_BADGE_DAY_OPTIONS.includes(v as (typeof PROSPECT_NEW_BADGE_DAY_OPTIONS)[number])) {
      return { error: `prospectNewBadgeDays must be one of: ${PROSPECT_NEW_BADGE_DAY_OPTIONS.join(", ")}` };
    }
    next.prospectNewBadgeDays = v;
  }

  return next;
}

/**
 * Auto-reject prospects in `new` or `screening` whose `created_at` is older than the configured window.
 * Invoked when admins load the prospects list (no separate scheduler).
 */
export async function applyStaleProspectAutoReject(
  supabase: SupabaseClient,
  businessId: string,
  staleDays: number,
): Promise<void> {
  if (staleDays < 1) return;
  const cutoff = new Date(Date.now() - staleDays * 24 * 60 * 60 * 1000).toISOString();
  const { error } = await supabase
    .from("hiring_prospects")
    .update({ stage: "rejected", updated_at: new Date().toISOString() })
    .eq("business_id", businessId)
    .in("stage", ["new", "screening"])
    .lt("created_at", cutoff);

  if (error) {
    console.error("applyStaleProspectAutoReject:", error.message);
  }
}
