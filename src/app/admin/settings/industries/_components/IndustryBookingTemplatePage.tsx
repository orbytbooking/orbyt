"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Loader2, ArrowLeft, Car, ChevronRight, Sparkles, Star } from "lucide-react";
import { useBusiness } from "@/contexts/BusinessContext";
import { toast } from "sonner";
import { dispatchIndustryChanged } from "@/lib/industryEvents";
import Link from "next/link";
import { cn } from "@/lib/utils";
import {
  buildForm1CustomerFacingPresetServiceCards,
  form1PresetFrequencyLabels,
} from "@/lib/form1PresetCustomerCatalog";

type IndustryRow = {
  id: string;
  name: string;
  description: string | null;
  business_id: string;
  customer_booking_form_layout?: string;
};

type LayoutKey = "form1" | "form2";

const FORM_TABS: { id: LayoutKey | "form3" | "form4" | "form5"; label: string; enabled: boolean }[] = [
  { id: "form1", label: "Form 1", enabled: true },
  { id: "form2", label: "Form 2", enabled: true },
  { id: "form3", label: "Form 3", enabled: false },
  { id: "form4", label: "Form 4", enabled: false },
  { id: "form5", label: "Form 5", enabled: false },
];

const DESCRIPTIONS: Record<LayoutKey, { headline: string; paragraphs: string[] }> = {
  form1: {
    headline: "Guided step-by-step booking",
    paragraphs: [
      "Form 1 walks customers through your flow in clear steps: pick a category, choose services from cards, then add details and pay. When you add an industry with the Form 1 starter template, we seed the standard cleaning-style defaults (Deep Clean, Basic Cleaning, Move In/Out Clean, Construction Clean Up, variable tiers, frequencies, extras)—all editable under Form 1 settings.",
      "The preview on this page uses those same default category and frequency names so admins and customers see a consistent “preset” Form 1 until you customize or replace rows in the database.",
      "Best for businesses that want a structured path similar to a wizard, with one main action per screen.",
    ],
  },
  form2: {
    headline: "Single-page universal layout",
    paragraphs: [
      "Form 2 shows the full booking experience on one scrollable page: frequencies, items or service types, packages, extras, customer fields, and payment. A sticky sidebar keeps a live summary, optional reviews, and FAQs visible while customers fill the form.",
      "This layout fits many industries—cleaning, car wash, lawn care, and more—because customers see context and totals without jumping between steps. Schedule and duration can follow the services you configure.",
      "Choose Form 2 when you prefer a modern, app-like flow where everything is visible and easy to adjust before checkout.",
    ],
  },
};

function Form1PreviewMock({ industryName }: { industryName: string }) {
  const presetServices = buildForm1CustomerFacingPresetServiceCards();
  const freqLabels = form1PresetFrequencyLabels();
  const showFreqs = freqLabels.slice(0, 6);
  return (
    <div className="flex h-full min-h-[320px] flex-col gap-3 rounded-lg border border-border/80 bg-muted/40 p-3 shadow-inner sm:min-h-[380px] sm:p-4">
      <div className="flex items-center justify-between gap-2 border-b border-border/60 pb-2">
        <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground sm:text-xs">
          Form 1 starter template
        </span>
        <span className="truncate text-[10px] text-primary sm:text-xs">{industryName}</span>
      </div>
      <div>
        <p className="text-[9px] font-medium text-muted-foreground sm:text-[10px]">Frequencies (seeded defaults)</p>
        <div className="mt-1 flex flex-wrap gap-1">
          {showFreqs.map((label, i) => (
            <span
              key={label}
              className={cn(
                "rounded-md px-1.5 py-0.5 text-[8px] font-medium sm:text-[9px]",
                i === 0 ? "bg-primary text-primary-foreground" : "bg-background text-muted-foreground ring-1 ring-border",
              )}
            >
              {label}
            </span>
          ))}
          {freqLabels.length > showFreqs.length ? (
            <span className="self-center text-[8px] text-muted-foreground">+{freqLabels.length - showFreqs.length}</span>
          ) : null}
        </div>
      </div>
      <div>
        <p className="text-[10px] font-semibold sm:text-xs">Select services</p>
        <p className="text-[8px] text-muted-foreground sm:text-[9px]">Same public-facing categories as the Form 1 seed.</p>
      </div>
      <div className="grid flex-1 grid-cols-2 gap-2 sm:grid-cols-4">
        {presetServices.map((c, idx) => (
          <div
            key={c.id}
            className={cn(
              "flex flex-col justify-between rounded-md border bg-background p-2 shadow-sm",
              idx === 1 && "ring-2 ring-primary",
            )}
          >
            <div className="h-7 rounded bg-muted/80 sm:h-9" />
            <div>
              <p className="line-clamp-2 text-[8px] font-semibold leading-tight sm:text-[9px]">{c.name}</p>
              <p className="text-[7px] text-muted-foreground sm:text-[8px]">Tiered pricing in Form 1</p>
            </div>
          </div>
        ))}
      </div>
      <div className="flex justify-end gap-1.5 pt-1">
        <span className="rounded-md bg-muted px-2 py-1 text-[9px] text-muted-foreground sm:text-[10px]">Back</span>
        <span className="rounded-md bg-primary px-2 py-1 text-[9px] text-primary-foreground sm:text-[10px]">Continue</span>
      </div>
    </div>
  );
}

function Form2PreviewMock({ industryName }: { industryName: string }) {
  return (
    <div className="flex h-full min-h-[320px] gap-2 rounded-lg border border-border/80 bg-muted/50 p-2 shadow-inner sm:min-h-[380px] sm:gap-3 sm:p-3">
      {/* Left: long single-page form — scrolls like customer Form 2; right: summary stays visible in the mock */}
      <div className="min-h-0 min-w-0 flex-[1.15] space-y-2 overflow-y-auto overscroll-y-contain rounded-md bg-background p-2 shadow-sm sm:max-h-[min(420px,55vh)] sm:p-3">
        <div className="flex flex-wrap gap-1">
          {["One-time", "Weekly", "Every other week", "Every 4 weeks"].map((f, i) => (
            <span
              key={f}
              className={cn(
                "rounded-md px-1.5 py-0.5 text-[8px] font-medium sm:px-2 sm:text-[9px]",
                i === 0 ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground",
              )}
            >
              {f}
            </span>
          ))}
        </div>
        <div>
          <p className="text-[10px] font-semibold sm:text-xs">What needs to be done?</p>
          <p className="text-[8px] text-muted-foreground sm:text-[9px]">
            Select the type of service so we can show accurate pricing.
          </p>
        </div>
        <div className="grid grid-cols-4 gap-1">
          {[
            { icon: Car, label: "Sedan", active: false },
            { icon: Car, label: "SUV / Minivan", active: true },
            { icon: Car, label: "Van", active: false },
            { icon: Car, label: "Motorcycle", active: false },
          ].map(({ icon: Icon, label, active }) => (
            <div
              key={label}
              className={cn(
                "flex flex-col items-center gap-0.5 rounded-md border py-1.5 text-center",
                active ? "border-primary bg-primary/10" : "border-border bg-muted/30",
              )}
            >
              <Icon className="h-3 w-3 text-muted-foreground sm:h-4 sm:w-4" />
              <span className="px-0.5 text-[7px] leading-tight text-muted-foreground sm:text-[8px]">{label}</span>
            </div>
          ))}
        </div>
        <div className="flex items-stretch gap-1.5">
          {["Full exterior", "Premium package"].map((name, i) => (
            <div
              key={name}
              className={cn(
                "relative flex-1 rounded-md border p-1.5 sm:p-2",
                i === 1 ? "border-primary ring-1 ring-primary/30" : "border-border",
              )}
            >
              <div className="mb-1 h-6 rounded bg-muted/70 sm:h-8" />
              <p className="text-[8px] font-medium sm:text-[9px]">{name}</p>
              <p className="text-[8px] text-muted-foreground">${i === 0 ? "29" : "49"}.00</p>
            </div>
          ))}
          <button
            type="button"
            className="flex w-6 shrink-0 items-center justify-center rounded-md border border-dashed border-border bg-muted/20 text-muted-foreground"
            aria-hidden
          >
            <ChevronRight className="h-3 w-3" />
          </button>
        </div>
        <div className="space-y-1 rounded-md border border-dashed border-border/60 bg-muted/20 p-2">
          <p className="text-[8px] font-semibold text-muted-foreground sm:text-[9px]">Customer details · notes · coupon · payment</p>
          <div className="h-8 rounded bg-muted/50" />
          <div className="h-8 rounded bg-muted/50" />
          <div className="h-12 rounded bg-muted/40" />
        </div>
        <div className="rounded-md bg-primary px-2 py-1.5 text-center text-[8px] font-medium text-primary-foreground sm:text-[9px]">
          Save booking
        </div>
      </div>
      <div className="sticky top-0 flex w-[38%] min-w-[88px] max-w-[140px] shrink-0 flex-col gap-1.5 self-start sm:max-w-[160px]">
        <div className="rounded-md border border-border bg-background p-1.5 shadow-sm sm:p-2">
          <p className="text-[8px] font-semibold sm:text-[9px]">Booking summary</p>
          <ul className="mt-1 space-y-0.5 text-[7px] text-muted-foreground sm:text-[8px]">
            <li>Industry: {industryName}</li>
            <li>Service: Example package</li>
            <li>Frequency: One-time</li>
          </ul>
          <p className="mt-1.5 text-[10px] font-bold text-amber-600 dark:text-amber-400 sm:text-xs">$29.00</p>
        </div>
        <div className="flex-1 rounded-md border border-amber-200/80 bg-amber-50/90 p-1.5 dark:border-amber-900/50 dark:bg-amber-950/40 sm:p-2">
          <div className="mb-0.5 flex items-center gap-0.5 text-amber-700 dark:text-amber-300">
            {[1, 2, 3, 4, 5].map((s) => (
              <Star key={s} className="h-2 w-2 fill-current sm:h-2.5 sm:w-2.5" />
            ))}
          </div>
          <p className="text-[7px] font-medium leading-snug text-amber-900 dark:text-amber-100 sm:text-[8px]">
            “Easy to book and great service.”
          </p>
          <p className="text-[6px] text-amber-800/80 dark:text-amber-200/80 sm:text-[7px]">— Preview review</p>
        </div>
      </div>
    </div>
  );
}

export default function IndustryBookingTemplatePage() {
  const router = useRouter();
  const params = useSearchParams();
  const industryId = params.get("industryId")?.trim() || "";
  const { currentBusiness } = useBusiness();

  const [industry, setIndustry] = useState<IndustryRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [layout, setLayout] = useState<LayoutKey>("form1");

  const load = useCallback(async () => {
    if (!currentBusiness?.id || !industryId) {
      setIndustry(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/industries?business_id=${encodeURIComponent(currentBusiness.id)}`, {
        credentials: "same-origin",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load industries");
      const list = Array.isArray(data.industries) ? data.industries : [];
      const row = list.find((i: IndustryRow) => i.id === industryId) ?? null;
      setIndustry(row);
      if (row?.customer_booking_form_layout === "form2") setLayout("form2");
      else setLayout("form1");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to load industry");
      setIndustry(null);
    } finally {
      setLoading(false);
    }
  }, [currentBusiness?.id, industryId]);

  useEffect(() => {
    void load();
  }, [load]);

  const description = useMemo(() => DESCRIPTIONS[layout], [layout]);

  const saveAndContinue = async () => {
    if (!industryId) return;
    setSaving(true);
    try {
      const res = await fetch("/api/industries", {
        method: "PATCH",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: industryId, customer_booking_form_layout: layout }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Failed to save");
      toast.success("Booking form saved");
      dispatchIndustryChanged();
      if (data.industry) setIndustry(data.industry as IndustryRow);
      const encName = encodeURIComponent((data.industry as IndustryRow | undefined)?.name ?? industry.name);
      const encId = encodeURIComponent(industryId);
      const scope = layout === "form2" ? "form2" : "form1";
      router.push(
        `/admin/settings/industries/form-1/locations?industry=${encName}&industryId=${encId}&bookingFormScope=${scope}`,
      );
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  if (!currentBusiness) {
    return (
      <div className="rounded-lg border bg-card p-6 text-muted-foreground">
        Please select a business to manage industries.
      </div>
    );
  }

  if (!industryId) {
    return (
      <div className="space-y-4">
        <div className="rounded-lg border bg-card p-6">
          <h1 className="text-xl font-semibold tracking-tight">Select form</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Add an industry first, or open this page from Industries → Booking form template.
          </p>
          <Button variant="outline" className="mt-4" asChild>
            <Link href="/admin/settings/industries">
              <ArrowLeft className="h-4 w-4" />
              Back to Industries
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!industry) {
    return (
      <div className="space-y-4">
        <div className="rounded-lg border bg-card p-6">
          <h1 className="text-xl font-semibold">Industry not found</h1>
          <p className="mt-2 text-sm text-muted-foreground">This industry may have been removed.</p>
          <Button variant="outline" className="mt-4" asChild>
            <Link href="/admin/settings/industries">Back to Industries</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-[calc(100dvh-10rem)] flex-col">
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Button variant="ghost" size="sm" className="-ml-2 h-8 text-muted-foreground" asChild>
          <Link href="/admin/settings/industries">
            <ArrowLeft className="h-4 w-4" />
            Industries
          </Link>
        </Button>
      </div>

      <header className="mb-4">
        <div className="flex items-center gap-2">
          <Sparkles className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Select form</h1>
        </div>
        <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
          Choose how customers book for <span className="font-medium text-foreground">{industry.name}</span>. Previews
          are illustrative; your live page uses your services and pricing.
        </p>
      </header>

      <div
        className="mb-5 flex flex-wrap gap-2"
        role="tablist"
        aria-label="Booking form templates"
      >
        {FORM_TABS.map((tab) => {
          const selected = tab.enabled && tab.id === layout;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={selected}
              disabled={!tab.enabled}
              onClick={() => {
                if (!tab.enabled) {
                  toast.message("Coming soon", { description: "Additional templates are not available yet." });
                  return;
                }
                setLayout(tab.id as LayoutKey);
              }}
              className={cn(
                "rounded-lg px-4 py-2 text-sm font-medium transition-colors",
                tab.enabled && selected && "bg-primary text-primary-foreground shadow-sm",
                tab.enabled && !selected && "bg-muted text-foreground hover:bg-muted/80",
                !tab.enabled && "cursor-not-allowed bg-muted/50 text-muted-foreground opacity-70",
              )}
            >
              {tab.label}
              {!tab.enabled && (
                <span className="ml-1.5 text-[10px] font-normal opacity-80">· Soon</span>
              )}
            </button>
          );
        })}
      </div>

      <div className="grid flex-1 grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1.7fr)_minmax(260px,1fr)] lg:gap-8">
        <section aria-label="Preview" className="min-h-0">
          <h2 className="sr-only">Preview</h2>
          <div className="h-full rounded-xl border bg-muted/30 p-3 sm:p-4">
            {layout === "form1" ? (
              <Form1PreviewMock industryName={industry.name} />
            ) : (
              <Form2PreviewMock industryName={industry.name} />
            )}
          </div>
        </section>

        <section aria-labelledby="form-description-heading" className="flex min-h-0 flex-col">
          <h2 id="form-description-heading" className="mb-2 text-base font-semibold">
            Description
          </h2>
          <div className="max-h-[min(420px,55vh)] overflow-y-auto rounded-xl border bg-card p-4 shadow-sm lg:max-h-[min(520px,60vh)]">
            <p className="text-sm font-medium text-foreground">{description.headline}</p>
            <div className="mt-3 space-y-3 text-sm leading-relaxed text-muted-foreground">
              {description.paragraphs.map((p, i) => (
                <p key={i}>{p}</p>
              ))}
            </div>
          </div>
        </section>
      </div>

      <footer className="sticky bottom-0 z-10 mt-auto border-t bg-background/95 py-4 shadow-[0_-4px_20px_rgba(0,0,0,0.06)] backdrop-blur supports-[backdrop-filter]:bg-background/85 -mx-6 px-6">
        <div className="flex justify-end">
          <Button size="lg" className="min-w-[120px]" onClick={() => void saveAndContinue()} disabled={saving}>
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Saving…
              </>
            ) : (
              "Next"
            )}
          </Button>
        </div>
      </footer>
    </div>
  );
}
