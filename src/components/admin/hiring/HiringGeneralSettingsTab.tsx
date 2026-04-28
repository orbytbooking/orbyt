"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useBusiness } from "@/contexts/BusinessContext";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  AUTO_REJECT_STALE_DAY_OPTIONS,
  DEFAULT_HIRING_GENERAL_SETTINGS,
  PROSPECT_NEW_BADGE_DAY_OPTIONS,
  type HiringGeneralSettings,
} from "@/lib/hiring-general-settings";
import { cn } from "@/lib/utils";

function InfoTip({ text, className }: { text: string; className?: string }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          className={cn(
            "inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-orange-200 bg-orange-50 text-orange-600 text-xs font-semibold",
            className,
          )}
          aria-label="More info"
        >
          i
        </button>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-xs text-left leading-snug">
        {text}
      </TooltipContent>
    </Tooltip>
  );
}

function YesNoRadios({
  value,
  onChange,
  name,
}: {
  value: boolean;
  onChange: (next: boolean) => void;
  name: string;
}) {
  return (
    <RadioGroup
      value={value ? "yes" : "no"}
      onValueChange={(v) => onChange(v === "yes")}
      className="flex flex-row flex-wrap gap-6 pt-1"
    >
      <div className="flex items-center gap-2">
        <RadioGroupItem value="yes" id={`${name}-yes`} />
        <Label htmlFor={`${name}-yes`} className="cursor-pointer font-normal text-slate-800">
          Yes
        </Label>
      </div>
      <div className="flex items-center gap-2">
        <RadioGroupItem value="no" id={`${name}-no`} />
        <Label htmlFor={`${name}-no`} className="cursor-pointer font-normal text-slate-800">
          No
        </Label>
      </div>
    </RadioGroup>
  );
}

function settingsEqual(a: HiringGeneralSettings, b: HiringGeneralSettings) {
  return JSON.stringify(a) === JSON.stringify(b);
}

export default function HiringGeneralSettingsTab() {
  const { currentBusiness } = useBusiness();
  const [draft, setDraft] = useState<HiringGeneralSettings>(DEFAULT_HIRING_GENERAL_SETTINGS);
  const [baseline, setBaseline] = useState<HiringGeneralSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [justSaved, setJustSaved] = useState(false);
  const [saveFailed, setSaveFailed] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const dirty = useMemo(() => {
    if (baseline === null) return false;
    return !settingsEqual(draft, baseline) || saveFailed;
  }, [draft, baseline, saveFailed]);

  const load = useCallback(async () => {
    if (!currentBusiness?.id) {
      setDraft(DEFAULT_HIRING_GENERAL_SETTINGS);
      setBaseline(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    setErrorMessage(null);
    setJustSaved(false);
    try {
      const res = await fetch("/api/admin/hiring/settings/general", {
        credentials: "include",
        headers: { "x-business-id": currentBusiness.id },
      });
      const json = (await res.json().catch(() => ({}))) as { error?: string; settings?: HiringGeneralSettings };
      if (!res.ok) throw new Error(json.error || "Could not load settings");
      const s = json.settings && typeof json.settings === "object" ? json.settings : DEFAULT_HIRING_GENERAL_SETTINGS;
      setSaveFailed(false);
      setDraft(s);
      setBaseline(s);
    } catch (e) {
      setErrorMessage(e instanceof Error ? e.message : "Could not load settings");
      setDraft(DEFAULT_HIRING_GENERAL_SETTINGS);
      setBaseline(DEFAULT_HIRING_GENERAL_SETTINGS);
    } finally {
      setLoading(false);
    }
  }, [currentBusiness?.id]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    setSaveFailed(false);
  }, [draft]);

  const handleSave = async () => {
    const bizId = currentBusiness?.id;
    if (!bizId || saving || !dirty) return;
    setSaving(true);
    setErrorMessage(null);
    setJustSaved(false);
    try {
      const res = await fetch("/api/admin/hiring/settings/general", {
        method: "PATCH",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          "x-business-id": bizId,
        },
        body: JSON.stringify(draft),
      });
      const json = (await res.json().catch(() => ({}))) as { error?: string; settings?: HiringGeneralSettings };
      if (!res.ok) throw new Error(json.error || "Save failed");
      const saved = json.settings && typeof json.settings === "object" ? json.settings : draft;
      setDraft(saved);
      setBaseline(saved);
      setSaveFailed(false);
      setJustSaved(true);
      window.setTimeout(() => setJustSaved(false), 2500);
    } catch (e) {
      setSaveFailed(true);
      setErrorMessage(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  if (!currentBusiness?.id) {
    return (
      <Card className="border-slate-200 shadow-sm">
        <CardContent className="py-10 text-center text-sm text-muted-foreground">
          Select a business to edit hiring settings.
        </CardContent>
      </Card>
    );
  }

  return (
    <TooltipProvider delayDuration={200}>
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">General</h2>
          <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
            Control how applications are filtered, how long prospects stay marked as new, and onboarding shortcuts.
          </p>
        </div>

        <Card className="border-slate-200 shadow-sm">
          <CardContent className="pt-8 pb-10 px-6 sm:px-10 space-y-10">
            {loading ? (
              <p className="text-sm text-muted-foreground">Loading settings…</p>
            ) : (
              <>
                {errorMessage ? <p className="text-sm text-destructive">{errorMessage}</p> : null}

                <section className="space-y-3">
                  <Label className="text-base font-medium text-slate-900 leading-snug">
                    Should we reject an application if someone was already rejected?
                  </Label>
                  <YesNoRadios
                    name="prev-reject"
                    value={draft.rejectIfPreviouslyRejected}
                    onChange={(v) => setDraft((d) => ({ ...d, rejectIfPreviouslyRejected: v }))}
                  />
                </section>

                <section className="space-y-3 max-w-md">
                  <Label className="text-base font-medium text-slate-900">Automatically reject within how many days?</Label>
                  <p className="text-xs text-muted-foreground -mt-1">
                    Prospects left in New or Screening longer than this are marked Rejected when you open the Prospects
                    list.
                  </p>
                  <Select
                    value={String(draft.autoRejectStaleDays)}
                    onValueChange={(v) =>
                      setDraft((d) => ({ ...d, autoRejectStaleDays: Number.parseInt(v, 10) || d.autoRejectStaleDays }))
                    }
                  >
                    <SelectTrigger className="border-slate-200 bg-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {AUTO_REJECT_STALE_DAY_OPTIONS.map((n) => (
                        <SelectItem key={n} value={String(n)}>
                          {n} days
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </section>

                <section className="space-y-3">
                  <Label className="text-base font-medium text-slate-900 leading-snug">
                    Should we automatically reject prospects based on quiz score?
                  </Label>
                  <YesNoRadios
                    name="quiz-reject"
                    value={draft.autoRejectByQuizScore}
                    onChange={(v) => setDraft((d) => ({ ...d, autoRejectByQuizScore: v }))}
                  />
                </section>

                {draft.autoRejectByQuizScore ? (
                  <section className="space-y-3 max-w-xs">
                    <div className="flex items-center gap-2">
                      <Label htmlFor="min-score" className="text-base font-medium text-slate-900">
                        Minimum score
                      </Label>
                      <InfoTip text="Quiz forms use graded questions. If the prospect’s total score is below this percentage, they are moved to Rejected after submit." />
                    </div>
                    <Input
                      id="min-score"
                      type="number"
                      min={0}
                      max={100}
                      className="border-slate-200 bg-white"
                      value={draft.quizMinimumScorePercent}
                      onChange={(e) => {
                        const n = Number.parseInt(e.target.value, 10);
                        setDraft((d) => ({
                          ...d,
                          quizMinimumScorePercent: Number.isFinite(n) ? Math.min(100, Math.max(0, n)) : d.quizMinimumScorePercent,
                        }));
                      }}
                    />
                  </section>
                ) : null}

                <section className="space-y-3">
                  <div className="flex items-start gap-2">
                    <Label className="text-base font-medium text-slate-900 leading-snug">
                      When creating a member, should we mark them automatically as onboarded or not?
                    </Label>
                    <InfoTip
                      className="mt-0.5"
                      text="When enabled, Create Member in the Prospects table marks the candidate as onboarded immediately. When disabled, they are moved to Interview only."
                    />
                  </div>
                  <YesNoRadios
                    name="auto-onboard"
                    value={draft.autoOnboardWhenCreateMember}
                    onChange={(v) => setDraft((d) => ({ ...d, autoOnboardWhenCreateMember: v }))}
                  />
                </section>

                <section className="space-y-3 max-w-md">
                  <div className="flex items-center gap-2">
                    <Label className="text-base font-medium text-slate-900 leading-snug">
                      Please choose the time duration how much time &apos;new&apos; tag will show?
                    </Label>
                    <InfoTip text="On the Prospects table, an extra “New” badge appears for candidates still in the New stage who were added within this window." />
                  </div>
                  <Select
                    value={String(draft.prospectNewBadgeDays)}
                    onValueChange={(v) =>
                      setDraft((d) => ({ ...d, prospectNewBadgeDays: Number.parseInt(v, 10) || d.prospectNewBadgeDays }))
                    }
                  >
                    <SelectTrigger className="border-slate-200 bg-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PROSPECT_NEW_BADGE_DAY_OPTIONS.map((n) => (
                        <SelectItem key={n} value={String(n)}>
                          {n} days
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </section>

                <div className="flex flex-col gap-3 border-t border-slate-200 pt-8 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-xs text-muted-foreground">
                    {justSaved ? (
                      <span className="text-emerald-600 font-medium">Your changes were saved.</span>
                    ) : (
                      "Save when you are ready to apply these rules to your hiring pipeline."
                    )}
                  </p>
                  <Button type="button" onClick={() => void handleSave()} disabled={!dirty || saving || loading}>
                    {saving ? "Saving…" : "Save"}
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </TooltipProvider>
  );
}
