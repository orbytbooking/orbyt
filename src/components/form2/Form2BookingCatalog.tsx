"use client";

import React, { useRef, useState } from "react";
import { Home, LayoutTemplate, Sparkles, ChevronLeft, ChevronRight, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { IndustryFormPresetIcon } from "@/components/industry/IndustryFormPresetIcon";

export type Form2CatalogItem = {
  id: string;
  name: string;
  category?: string | null;
};

export type Form2PackageRow = {
  id: string;
  name: string;
  variable_category: string;
  description?: string | null;
  price: number;
  time_minutes?: number | null;
  icon?: string | null;
};

function itemVisualKind(category: string | null | undefined): "bedroom" | "sqft" | "default" {
  const c = (category || "").toLowerCase();
  if (c.includes("sq") || c.includes("ft") || c.includes("foot") || c.includes("meter") || c.includes("area"))
    return "sqft";
  if (c.includes("bed")) return "bedroom";
  return "default";
}

export function Form2CategoryIcon({
  category,
  size = "md",
}: {
  category?: string | null;
  size?: "sm" | "md";
}) {
  const k = itemVisualKind(category);
  const wrap = cn(
    "flex shrink-0 items-center justify-center border border-slate-200 bg-gradient-to-br from-slate-50 to-slate-100 text-slate-600 dark:border-slate-600 dark:from-slate-800 dark:to-slate-900 dark:text-slate-300",
    size === "sm" ? "h-11 w-11 rounded-xl" : "h-12 w-12 rounded-lg",
  );
  if (k === "bedroom") {
    return (
      <div className={wrap}>
        <Home className={size === "sm" ? "h-5 w-5" : "h-6 w-6"} strokeWidth={1.5} />
      </div>
    );
  }
  if (k === "sqft") {
    return (
      <div className={wrap}>
        <LayoutTemplate className={size === "sm" ? "h-5 w-5" : "h-6 w-6"} strokeWidth={1.5} />
      </div>
    );
  }
  return (
    <div className={wrap}>
      <Sparkles className={size === "sm" ? "h-5 w-5" : "h-5 w-5"} strokeWidth={1.5} />
    </div>
  );
}

function Form2ItemIcon({
  category,
  uiVariant = "customer",
}: {
  category?: string | null;
  uiVariant?: "customer" | "admin";
}) {
  const k = itemVisualKind(category);
  const wrap = cn(
    "flex shrink-0 items-center justify-center border border-slate-200 bg-gradient-to-br from-slate-50 to-slate-100 text-slate-600 dark:border-slate-600 dark:from-slate-800 dark:to-slate-900 dark:text-slate-300",
    uiVariant === "admin" ? "h-12 w-12 rounded-lg" : "h-16 w-16 rounded-xl",
  );
  if (k === "bedroom") {
    return (
      <div className={wrap}>
        <Home className={uiVariant === "admin" ? "h-6 w-6" : "h-8 w-8"} strokeWidth={1.5} />
      </div>
    );
  }
  if (k === "sqft") {
    return (
      <div className={wrap}>
        <LayoutTemplate className={uiVariant === "admin" ? "h-6 w-6" : "h-8 w-8"} strokeWidth={1.5} />
      </div>
    );
  }
  return (
    <div className={wrap}>
      <Sparkles className={uiVariant === "admin" ? "h-5 w-5" : "h-7 w-7"} strokeWidth={1.5} />
    </div>
  );
}

function parsePackageDescription(description: string | null | undefined): {
  summary: string;
  bulletLines: string[];
} {
  const raw = String(description ?? "").trim();
  if (!raw) return { summary: "", bulletLines: [] };

  const byLine = raw
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);
  const summary = byLine[0] ?? "";
  const bulletLines = byLine
    .slice(1)
    .map((s) => s.replace(/^[•\-\*]\s*/, "").trim())
    .filter(Boolean);

  if (bulletLines.length > 0) return { summary, bulletLines };

  const byBullet = raw
    .split(/•|;/)
    .map((s) => s.trim())
    .filter(Boolean);
  if (byBullet.length >= 2) {
    return {
      summary: byBullet[0] ?? summary,
      bulletLines: byBullet.slice(1),
    };
  }

  return { summary, bulletLines: [] };
}

function packageFeatureLines(pkg: Form2PackageRow): string[] {
  const d = String(pkg.description ?? "").trim();
  if (d) {
    const parsed = parsePackageDescription(d);
    if (parsed.bulletLines.length > 0) return parsed.bulletLines.slice(0, 5);
  }
  const t = Math.max(0, Math.round(Number(pkg.time_minutes) || 0));
  const out: string[] = [`$${Number(pkg.price || 0).toFixed(2)} flat rate`];
  if (t > 0) out.push(`About ${t} minutes on site`);
  out.push("Licensed & insured team");
  out.push("Satisfaction-focused service");
  return out.slice(0, 4);
}

export function Form2ItemPickerGrid({
  items,
  selectedId,
  onSelect,
  className,
  uiVariant = "customer",
}: {
  items: Form2CatalogItem[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  className?: string;
  uiVariant?: "customer" | "admin";
}) {
  if (items.length === 0) return null;
  return (
    <div className={cn("mb-6", className)}>
      <h3 className="text-base font-semibold text-slate-800 dark:text-slate-100 mb-3">Select item(s)</h3>
      <div
        className={cn(
          uiVariant === "admin"
            ? "flex flex-wrap items-start gap-2.5"
            : "grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4",
        )}
      >
        {items.map((item) => {
          const active = selectedId === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelect(item.id)}
              className={cn(
                uiVariant === "admin"
                  ? "flex h-[78px] w-[170px] max-w-full flex-col items-center justify-center gap-1 rounded-lg border-2 p-1.5 text-center transition-all"
                  : "flex flex-col items-center gap-3 rounded-2xl border-2 p-4 text-center transition-all min-h-[140px]",
                uiVariant === "admin"
                  ? active
                    ? "border-slate-400 bg-slate-200/80 shadow-inner dark:border-slate-500 dark:bg-slate-700/80"
                    : "border-slate-200 bg-white hover:border-cyan-400 dark:border-slate-600 dark:bg-card dark:hover:border-cyan-600"
                  : active
                    ? "border-slate-500 bg-slate-200/90 shadow-inner dark:border-slate-400 dark:bg-slate-700/90"
                    : "border-slate-200 bg-white hover:border-cyan-400 hover:shadow-md dark:border-slate-600 dark:bg-card dark:hover:border-cyan-600",
              )}
            >
              <Form2ItemIcon category={item.category} uiVariant={uiVariant} />
              <span
                className={cn(
                  uiVariant === "admin" ? "text-[11px] font-medium" : "text-xs font-semibold",
                  "leading-snug text-slate-700 dark:text-slate-100",
                )}
              >
                {item.name}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function Form2PackageCardStrip({
  packages,
  onAdd,
  selectedPackageName,
  scrollRef,
  className,
  uiVariant = "customer",
}: {
  packages: Form2PackageRow[];
  onAdd: (pkg: Form2PackageRow) => void;
  /** Highlight when this package name is selected (admin) or matches booking (customer). */
  selectedPackageName?: string | null;
  scrollRef?: React.RefObject<HTMLDivElement | null>;
  className?: string;
  uiVariant?: "customer" | "admin";
}) {
  const fallbackRef = useRef<HTMLDivElement>(null);
  const scrollerRef = scrollRef ?? fallbackRef;
  const [activeIndex, setActiveIndex] = useState(0);
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);

  const maxIndex = Math.max(0, packages.length - 1);
  const clampedActiveIndex = Math.min(activeIndex, maxIndex);

  const scrollToIndex = (index: number) => {
    const nextIndex = Math.min(Math.max(index, 0), maxIndex);
    setActiveIndex(nextIndex);
    const container = scrollerRef.current;
    const card = cardRefs.current[nextIndex];
    if (!container || !card) return;
    const left = Math.max(0, card.offsetLeft - 4);
    container.scrollTo({ left, behavior: "smooth" });
  };

  const scrollBy = (dir: -1 | 1) => {
    scrollToIndex(clampedActiveIndex + dir);
  };

  const viewAll = () => {
    scrollToIndex(maxIndex);
  };

  if (packages.length === 0) return null;

  const canGoLeft = clampedActiveIndex > 0;
  const canGoRight = clampedActiveIndex < maxIndex;

  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <h3 className="text-base font-semibold text-slate-800 dark:text-slate-100">Choose Packages</h3>
          <button
            type="button"
            className="text-sm font-semibold text-orange-600 hover:text-orange-700 dark:text-orange-400 dark:hover:text-orange-300"
            onClick={viewAll}
          >
            ( View all )
          </button>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            className={cn(
              "inline-flex items-center justify-center rounded-md text-slate-700 disabled:cursor-not-allowed disabled:opacity-40 dark:text-slate-300",
              uiVariant === "admin"
                ? "h-8 w-8 hover:bg-slate-100 dark:hover:bg-slate-800"
                : "h-9 w-9 border border-slate-200 bg-white hover:bg-slate-50 dark:border-slate-600 dark:bg-card dark:hover:bg-slate-800",
            )}
            aria-label="Scroll packages left"
            onClick={() => scrollBy(-1)}
            disabled={!canGoLeft}
          >
            <ChevronLeft className={uiVariant === "admin" ? "h-4 w-4" : "h-5 w-5"} />
          </button>
          <button
            type="button"
            className={cn(
              "inline-flex items-center justify-center rounded-md text-slate-700 disabled:cursor-not-allowed disabled:opacity-40 dark:text-slate-300",
              uiVariant === "admin"
                ? "h-8 w-8 hover:bg-slate-100 dark:hover:bg-slate-800"
                : "h-9 w-9 border border-slate-200 bg-white hover:bg-slate-50 dark:border-slate-600 dark:bg-card dark:hover:bg-slate-800",
            )}
            aria-label="Scroll packages right"
            onClick={() => scrollBy(1)}
            disabled={!canGoRight}
          >
            <ChevronRight className={uiVariant === "admin" ? "h-4 w-4" : "h-5 w-5"} />
          </button>
        </div>
      </div>
      <div
        ref={scrollerRef}
        className={cn(
          "flex flex-row flex-nowrap overflow-x-auto pb-2 pt-1 snap-x snap-mandatory scroll-pl-1 [-webkit-overflow-scrolling:touch]",
          uiVariant === "admin" ? "gap-5 px-1" : "gap-4",
        )}
        onScroll={() => {
          const el = scrollerRef.current;
          if (!el || cardRefs.current.length === 0) return;
          const left = el.scrollLeft;
          let nearestIdx = 0;
          let nearestDist = Number.POSITIVE_INFINITY;
          cardRefs.current.forEach((card, i) => {
            if (!card) return;
            const dist = Math.abs(card.offsetLeft - left);
            if (dist < nearestDist) {
              nearestDist = dist;
              nearestIdx = i;
            }
          });
          if (nearestIdx !== clampedActiveIndex) {
            setActiveIndex(nearestIdx);
          }
        }}
      >
        {packages.map((pkg, idx) => {
          const lines = packageFeatureLines(pkg);
          const parsed = parsePackageDescription(pkg.description ?? "");
          const selected = selectedPackageName && selectedPackageName === pkg.name;
          return (
            <div
              key={pkg.id}
              ref={(el) => {
                cardRefs.current[idx] = el;
              }}
              className={cn(
                uiVariant === "admin"
                  ? "flex min-h-[430px] min-w-[270px] max-w-[290px] shrink-0 snap-start flex-col overflow-hidden rounded-lg border bg-white p-4 shadow-sm dark:bg-card"
                  : "flex min-w-[260px] max-w-[280px] shrink-0 snap-start flex-col rounded-2xl border-2 bg-white p-4 shadow-sm dark:bg-card",
                selected
                  ? "border-cyan-500 ring-2 ring-cyan-500/30"
                  : "border-slate-200 dark:border-slate-600",
              )}
            >
              <h4
                className={cn(
                  "font-bold text-slate-900 dark:text-slate-50 leading-tight",
                  uiVariant === "admin"
                    ? "text-lg text-center border-b border-slate-200 dark:border-slate-700 pb-3 -mx-4 px-4"
                    : "text-base",
                )}
              >
                {pkg.name}
              </h4>
              <div className="mt-3 flex flex-1 flex-col items-center">
                <IndustryFormPresetIcon icon={pkg.icon} labelHint={pkg.name} framed />
              </div>
              <p className={cn("mt-3 text-xs text-muted-foreground", uiVariant === "admin" ? "line-clamp-2" : "line-clamp-3")}>
                {parsed.summary ||
                  `Includes the core tasks for this tier. ${pkg.time_minutes ? `Typical visit ${pkg.time_minutes} min.` : ""}`}
              </p>
              <ul
                className={cn(
                  "mt-3 space-y-1.5 text-xs text-slate-700 dark:text-slate-300 flex-1",
                  uiVariant === "admin" ? "min-h-[110px]" : "",
                )}
              >
                {lines.map((line, li) => (
                  <li key={`${pkg.id}-f-${li}`} className="flex gap-2">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-cyan-500" />
                    <span>{line}</span>
                  </li>
                ))}
              </ul>
              <Button
                type="button"
                variant="outline"
                className={cn(
                  "mt-4 w-full",
                  uiVariant === "admin"
                    ? "border-blue-500 text-blue-700 hover:bg-blue-50 dark:border-blue-600 dark:text-blue-300 dark:hover:bg-blue-950/40"
                    : "border-cyan-500 text-cyan-700 hover:bg-cyan-50 dark:border-cyan-600 dark:text-cyan-300 dark:hover:bg-cyan-950/40",
                )}
                onClick={() => onAdd(pkg)}
              >
                Add
              </Button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export type Form2AddedPackageLine = {
  itemId: string;
  itemName: string;
  category: string;
  packageName: string;
  packagePrice: number;
  packageTimeMinutes: number | null;
};

export function Form2AddedPackagesSection({
  serviceTitle,
  serviceCategory,
  frequencyLabel,
  lines,
  addOnCount,
  extraCount,
  onRemoveLine,
  onRemoveAll,
  onAddAnother,
  renderLineExtras,
  className,
}: {
  serviceTitle: string;
  serviceCategory?: string | null;
  frequencyLabel?: string | null;
  lines: Form2AddedPackageLine[];
  addOnCount: number;
  extraCount: number;
  onRemoveLine: (itemId: string, category: string, packageName: string) => void;
  onRemoveAll?: () => void;
  onAddAnother: () => void;
  renderLineExtras?: (line: Form2AddedPackageLine) => React.ReactNode;
  className?: string;
}) {
  if (lines.length === 0) return null;

  const subtitle =
    lines.length === 1
      ? lines[0].packageName
      : `${lines.length} packages`;

  return (
    <div className={cn("mt-6 space-y-4", className)}>
      <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-50">Packages added</h3>
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-600 dark:bg-card space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <Form2CategoryIcon category={serviceCategory ?? lines[0]?.category} size="sm" />
            <div className="min-w-0">
              <p className="text-sm font-semibold text-slate-900 dark:text-slate-50 truncate">
                {serviceTitle}
              </p>
              <p className="text-xs text-muted-foreground truncate">
                {subtitle}
                {frequencyLabel ? ` · ${frequencyLabel}` : ""}
              </p>
            </div>
          </div>
          {onRemoveAll ? (
            <button
              type="button"
              className="rounded-full p-1 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
              aria-label="Remove all packages"
              onClick={onRemoveAll}
            >
              <X className="h-4 w-4" />
            </button>
          ) : null}
        </div>
        <div className="space-y-2">
          {lines.map((line) => (
            <div key={`${line.itemId}-${line.packageName}`} className="space-y-2">
              <div className="rounded-lg border border-slate-200/80 bg-slate-50/80 px-3 py-2 text-xs dark:border-slate-700 dark:bg-slate-900/40 flex items-center justify-between gap-2">
                <span className="min-w-0 truncate">
                  <span className="font-semibold text-slate-800 dark:text-slate-100">{line.itemName}</span>
                  <span className="text-muted-foreground">
                    {" "}
                    - {line.packageName}
                    {` · $${Number(line.packagePrice || 0).toFixed(2)}`}
                    {line.packageTimeMinutes ? ` · ${line.packageTimeMinutes} min` : ""}
                  </span>
                </span>
                <button
                  type="button"
                  className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-slate-500 hover:bg-slate-200/70 dark:hover:bg-slate-800"
                  aria-label={`Remove ${line.itemName}`}
                  onClick={() => onRemoveLine(line.itemId, line.category, line.packageName)}
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              {renderLineExtras ? renderLineExtras(line) : null}
            </div>
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          <span className="inline-flex items-center rounded-full border border-cyan-300/70 bg-cyan-50 px-2.5 py-1 text-xs font-semibold text-cyan-700 dark:border-cyan-700/60 dark:bg-cyan-950/30 dark:text-cyan-300">
            Add-ons: {addOnCount}
          </span>
          <span className="inline-flex items-center rounded-full border border-violet-300/70 bg-violet-50 px-2.5 py-1 text-xs font-semibold text-violet-700 dark:border-violet-700/60 dark:bg-violet-950/30 dark:text-violet-300">
            Extras: {extraCount}
          </span>
        </div>
      </div>
      <Button
        type="button"
        className="w-full bg-gradient-to-r from-cyan-500 to-sky-500 text-white shadow-md hover:from-cyan-600 hover:to-sky-600"
        onClick={onAddAnother}
      >
        + Add another item
      </Button>
    </div>
  );
}
