"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ChevronDown, Info, Minus, Play, Plus } from "lucide-react";
import { useBusiness } from "@/contexts/BusinessContext";
import { useToast } from "@/hooks/use-toast";
import {
  bookingFormScopeFromSearchParams,
  FORM2_STANDALONE_PACKAGE_CATEGORY,
  FORM2_STANDALONE_PACKAGE_LIST_LABEL,
} from "@/lib/bookingFormScope";

type PricingRow = {
  id: string;
  name: string;
  price: number;
  time_minutes: number;
  price_merchant_location?: number | null;
  time_minutes_merchant_location?: number | null;
  display: "Customer Frontend, Backend & Admin" | "Customer Backend & Admin" | "Admin Only";
  service_category: string;
  frequency: string;
  variable_category: string;
  description: string;
  is_default: boolean;
  show_based_on_frequency: boolean;
  show_based_on_service_category: boolean;
  excluded_extras: string[];
  excluded_services: string[];
  sort_order: number;
};

function formatParameterPrice(price: number): string {
  if (price == null || Number.isNaN(Number(price))) return "—";
  const n = Number(price);
  if (n === 0) return "—";
  return `$${n.toFixed(2)}`;
}

function formatParameterTimeMinutes(minutes: number): string {
  const m = Math.round(Number(minutes) || 0);
  if (m <= 0) return "0";
  const h = Math.floor(m / 60);
  const min = m % 60;
  if (h > 0 && min > 0) return `${h}Hr ${min}Min`;
  if (h > 0) return `${h}Hr`;
  return `${min}Min`;
}

function formatForm2PackageDisplay(
  display: PricingRow["display"] | string | undefined,
): string {
  const d = String(display ?? "").trim();
  if (d === "Customer Frontend, Backend & Admin") return "Both";
  if (d === "Customer Backend & Admin") return "Backend & admin";
  if (d === "Admin Only") return "Admin only";
  return d || "—";
}

/** Service area (travel) vs merchant location (store); tooltips match product copy. */
const FORM2_PRESET_TOOLTIPS = {
  sa: "S.A. means service area. In other words at someone's location.",
  ml: "M.L. means merchant location. In other words if you accept clients at your store what is the price and time of this option. If you allow clients at your store and you also travel to them, you can set 2 different sets of pricing points. One for the service area and one for the merchant store.",
} as const;

const FORM2_PRESET_CHIPS: readonly { id: string; badge: string; tooltip: string }[] = [
  { id: "service_area", badge: "S.A.", tooltip: FORM2_PRESET_TOOLTIPS.sa },
  { id: "merchant_location", badge: "M.L.", tooltip: FORM2_PRESET_TOOLTIPS.ml },
];

/** First value = S.A., second = M.L. (merchant); M.L. falls back to S.A. when unset in DB. */
function Form2PresetStack({ values }: { values: readonly [string, string] }) {
  return (
    <div className="flex flex-wrap gap-2">
      {FORM2_PRESET_CHIPS.map((preset, i) => {
        const isCyan = i % 2 === 0;
        const valueText = values[i] ?? values[0];
        return (
          <span
            key={preset.id}
            className={`inline-flex items-center gap-1.5 rounded-lg border px-2 py-1.5 text-sm tabular-nums ${
              isCyan
                ? "border-cyan-200 bg-cyan-50 text-cyan-950 dark:border-cyan-800 dark:bg-cyan-950/35 dark:text-cyan-100"
                : "border-orange-200 bg-orange-50 text-orange-950 dark:border-orange-800 dark:bg-orange-950/35 dark:text-orange-100"
            }`}
          >
            <span
              className={`rounded px-1.5 py-0.5 text-[10px] font-bold tracking-wide ${
                isCyan
                  ? "bg-cyan-200/80 text-cyan-950 dark:bg-cyan-800 dark:text-cyan-50"
                  : "bg-orange-200/80 text-orange-950 dark:bg-orange-900 dark:text-orange-50"
              }`}
            >
              {preset.badge}
            </span>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  className="inline-flex shrink-0 rounded-full text-orange-600 outline-none ring-offset-background hover:text-orange-700 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 dark:text-orange-400 dark:hover:text-orange-300"
                  aria-label={`What ${preset.badge} means`}
                >
                  <Info className="h-3.5 w-3.5" strokeWidth={2.5} />
                </button>
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-[min(22rem,calc(100vw-2rem))] text-left text-xs font-normal leading-snug">
                {preset.tooltip}
              </TooltipContent>
            </Tooltip>
            <span>{valueText}</span>
          </span>
        );
      })}
    </div>
  );
}

type CategoryEntry = {
  key: string;
  label: string;
  fromVariable: boolean;
  isActive: boolean;
};

type PricingVariable = {
  id: string;
  name: string;
  category: string;
  description: string;
  isActive: boolean;
  sortOrder: number;
};

const mapApiPricingVariables = (
  raw: Array<{
    id: string;
    name?: string;
    category?: string;
    description?: string;
    is_active?: boolean;
    sort_order?: number;
  }>
): PricingVariable[] =>
  (raw || []).map((v) => ({
    id: v.id,
    name: (v.name ?? v.category ?? "").trim(),
    category: (v.category ?? v.name ?? "").trim(),
    description: v.description ?? "",
    isActive: v.is_active ?? true,
    sortOrder: typeof v.sort_order === "number" ? v.sort_order : 0,
  }));

export default function IndustryFormPricingParameterPage() {
  const params = useSearchParams();
  const router = useRouter();
  const industry = params.get("industry") || "Industry";
  const bookingFormScope = bookingFormScopeFromSearchParams(params.get("bookingFormScope"));
  const scopeQs = `&bookingFormScope=${bookingFormScope}`;
  const isForm2 = bookingFormScope === "form2";
  const { currentBusiness } = useBusiness();
  const { toast } = useToast();

  const pageCopy = useMemo(
    () =>
      isForm2
        ? ({
            loadError: "Failed to load packages",
            cardTitle: "Packages",
            cardDesc: `Manage package rows for ${industry}.`,
            manageLink: "Manage items",
            howItWorksTitle: "How it works",
            howItWorksBody:
              "Packages can be tied to items (for example bedroom count or square footage) or shown on their own. A barber might sell a package of three haircuts; a nail salon might show different items depending on which package the customer picks. Price and time each list two chips: S.A. (service area—at the customer’s location) and M.L. (merchant location—at your store). Hover the orange info icons for definitions. Both chips use the same values until separate amounts are stored per channel.",
            emptyBlurb:
              "No items are set up for this industry yet. Add items first (for example bedroom tiers or square footage), then add packages for each.",
            emptyCta: "Manage items",
            filterAll: "All",
            filterActive: "Active",
            filterInactive: "Inactive",
            filterHelp:
              "Filter which items’ packages appear. S.A. and M.L. show the same row price and time until separate service-area and merchant-location values exist. Starter packages are created in the database for Form 2 industries that have items but no packages yet.",
            optEmptyTitle: "No packages for this item yet.",
            optEmptyBtn: "Add package for this item",
            orphanNote: " · (from existing packages)",
            loadingLine: "Loading…",
          } as const)
        : ({
            loadError: "Failed to load pricing parameters",
            cardTitle: `${industry} - Form 1 / Pricing Parameter`,
            cardDesc: `Manage pricing parameters for ${industry}.`,
            howItWorksTitle: "",
            howItWorksBody: "",
            manageLink: "Manage Variables",
            emptyBlurb:
              "No variables are set up for this industry yet. Add variables first (for example Sq ft, Bedrooms, Bathrooms), then add pricing options for each.",
            emptyCta: "Manage variables",
            filterAll: "All variables",
            filterActive: "Active only",
            filterInactive: "Inactive only",
            filterHelp:
              "All variables from Manage Variables are listed here. Expand a row to edit its pricing options. Use the filter to narrow by active/inactive.",
            optEmptyTitle: "No pricing options for this variable yet.",
            optEmptyBtn: "Add option for this variable",
            orphanNote: " · (from existing parameters)",
            loadingLine: "Loading pricing data…",
          } as const),
    [isForm2, industry],
  );

  const [allRows, setAllRows] = useState<Record<string, PricingRow[]>>({});
  const [variables, setVariables] = useState<PricingVariable[]>([]);
  const [variableFilter, setVariableFilter] = useState<"all" | "active" | "inactive">(() =>
    bookingFormScope === "form2" ? "active" : "all",
  );
  /** Which variable sections are expanded (accordion). */
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({});
  const [excludeParameters, setExcludeParameters] = useState<any[]>([]);
  const [industryId, setIndustryId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Fetch industry ID and data from database
  useEffect(() => {
    if (!currentBusiness?.id || !industry) return;

    const fetchData = async () => {
      try {
        setLoading(true);
        
        // Fetch industry ID
        const industriesResponse = await fetch(`/api/industries?business_id=${currentBusiness.id}`);
        const industriesData = await industriesResponse.json();
        const currentIndustry = industriesData.industries?.find((ind: any) => ind.name === industry);
        
        if (!currentIndustry) {
          console.error("Industry not found");
          setIndustryId(null);
          setAllRows({});
          setVariables([]);
          setExcludeParameters([]);
          setLoading(false);
          return;
        }

        setIndustryId(currentIndustry.id);

        // Fetch pricing parameters from database
        const pricingResponse = await fetch(
          `/api/pricing-parameters?industryId=${encodeURIComponent(currentIndustry.id)}&businessId=${encodeURIComponent(currentBusiness.id)}${scopeQs}`,
        );
        const pricingData = await pricingResponse.json();
        
        if (pricingData.pricingParameters) {
          // Group by variable_category
          const grouped: Record<string, PricingRow[]> = {};
          pricingData.pricingParameters.forEach((param: any) => {
            if (!grouped[param.variable_category]) {
              grouped[param.variable_category] = [];
            }
            const row: PricingRow = {
              id: param.id,
              name: param.name,
              price: Number(param.price) || 0,
              time_minutes: Number(param.time_minutes) || 0,
              price_merchant_location:
                param.price_merchant_location != null ? Number(param.price_merchant_location) : null,
              time_minutes_merchant_location:
                param.time_minutes_merchant_location != null
                  ? Number(param.time_minutes_merchant_location)
                  : null,
              display: param.display,
              service_category: param.service_category ?? "",
              frequency: param.frequency ?? "",
              variable_category: param.variable_category,
              description: param.description ?? "",
              is_default: !!param.is_default,
              show_based_on_frequency: !!param.show_based_on_frequency,
              show_based_on_service_category: !!param.show_based_on_service_category,
              excluded_extras: param.excluded_extras ?? [],
              excluded_services: param.excluded_services ?? [],
              sort_order: typeof param.sort_order === "number" ? param.sort_order : 0,
            };
            grouped[param.variable_category].push(row);
          });
          setAllRows(grouped);
        } else {
          setAllRows({});
        }

        const varsRes = await fetch(
          `/api/pricing-variables?industryId=${encodeURIComponent(currentIndustry.id)}&businessId=${encodeURIComponent(currentBusiness.id)}${scopeQs}`,
        );
        const varsData = varsRes.ok ? await varsRes.json() : { variables: [] };
        setVariables(mapApiPricingVariables(varsData.variables ?? []));

        // Fetch exclude parameters from database
        const excludeResponse = await fetch(`/api/exclude-parameters?industryId=${currentIndustry.id}`);
        const excludeData = await excludeResponse.json();
        
        if (excludeData.excludeParameters) {
          setExcludeParameters(excludeData.excludeParameters);
        }

        setLoading(false);
      } catch (error) {
        console.error('Error fetching data:', error);
        toast({
          title: "Error",
          description: pageCopy.loadError,
          variant: "destructive",
        });
        setLoading(false);
      }
    };

    fetchData();
  }, [currentBusiness, industry, bookingFormScope, pageCopy.loadError]);

  /**
   * Every variable category from Manage Variables (merge rows that share the same category),
   * then any parameter-only categories not in that list. Default UI shows all of them (filter = "all").
   */
  const allCategoryEntries = useMemo((): CategoryEntry[] => {
    const sortedVars = [...variables].sort(
      (a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name)
    );
    const mergedByKey = new Map<string, { label: string; isActive: boolean; sortOrder: number }>();
    for (const v of sortedVars) {
      const key = v.category?.trim();
      if (!key) continue;
      const label = (v.name?.trim() || key).trim();
      const prev = mergedByKey.get(key);
      if (!prev) {
        mergedByKey.set(key, {
          label: label || key,
          isActive: Boolean(v.isActive),
          sortOrder: v.sortOrder,
        });
      } else {
        mergedByKey.set(key, {
          label: prev.label || label || key,
          isActive: prev.isActive || Boolean(v.isActive),
          sortOrder: Math.min(prev.sortOrder, v.sortOrder),
        });
      }
    }

    const fromVariables: CategoryEntry[] = Array.from(mergedByKey.entries())
      .sort(
        (a, b) =>
          a[1].sortOrder - b[1].sortOrder || a[1].label.localeCompare(b[1].label)
      )
      .map(([key, m]) => ({
        key,
        label: m.label,
        fromVariable: true,
        isActive: m.isActive,
      }));

    const seen = new Set(mergedByKey.keys());
    const orphans: CategoryEntry[] = [];
    for (const key of Object.keys(allRows)) {
      const k = key?.trim();
      if (!k || seen.has(k)) continue;
      seen.add(k);
      const label =
        isForm2 && k === FORM2_STANDALONE_PACKAGE_CATEGORY ? FORM2_STANDALONE_PACKAGE_LIST_LABEL : k;
      orphans.push({ key: k, label, fromVariable: false, isActive: true });
    }
    orphans.sort((a, b) => a.label.localeCompare(b.label));

    return [...fromVariables, ...orphans];
  }, [variables, allRows, isForm2]);

  const visibleCategoryEntries = useMemo(() => {
    if (variableFilter === "all") return allCategoryEntries;
    if (variableFilter === "active") return allCategoryEntries.filter((c) => c.isActive);
    return allCategoryEntries.filter((c) => !c.isActive);
  }, [allCategoryEntries, variableFilter]);

  const form2FlatPackages = useMemo(() => {
    if (!isForm2) return [] as Array<{ row: PricingRow; categoryKey: string }>;
    const out: Array<{ row: PricingRow; categoryKey: string }> = [];
    for (const c of allCategoryEntries) {
      const rows = (allRows[c.key] || [])
        .slice()
        .sort((a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name));
      for (const row of rows) {
        out.push({ row, categoryKey: c.key });
      }
    }
    return out;
  }, [isForm2, allCategoryEntries, allRows]);

  const remove = async (variableCategory: string, id: string) => {
    if (!industryId || !currentBusiness?.id) {
      toast({
        title: "Error",
        description: "Missing business or industry context.",
        variant: "destructive",
      });
      return;
    }
    try {
      const response = await fetch(
        `/api/pricing-parameters?id=${encodeURIComponent(id)}&industryId=${encodeURIComponent(industryId)}&businessId=${encodeURIComponent(currentBusiness.id)}${scopeQs}`,
        { method: "DELETE" },
      );

      if (!response.ok) {
        throw new Error('Failed to delete pricing parameter');
      }

      setAllRows((prev) => ({
        ...prev,
        [variableCategory]: (prev[variableCategory] || []).filter((r) => r.id !== id),
      }));

      toast({
        title: "Success",
        description: "Pricing parameter deleted successfully",
      });
    } catch (error) {
      console.error('Error deleting pricing parameter:', error);
      toast({
        title: "Error",
        description: "Failed to delete pricing parameter",
        variant: "destructive",
      });
    }
  };

  const move = async (variableCategory: string, id: string, dir: -1 | 1) => {
    setAllRows((prev) => {
      const rows = prev[variableCategory] || [];
      const idx = rows.findIndex((r) => r.id === id);
      if (idx < 0) return prev;
      const j = idx + dir;
      if (j < 0 || j >= rows.length) return prev;
      const copy = [...rows];
      const [item] = copy.splice(idx, 1);
      copy.splice(j, 0, item);
      return {
        ...prev,
        [variableCategory]: copy,
      };
    });
  };

  const updatePriority = async () => {
    if (!industryId || !currentBusiness?.id) {
      toast({
        title: "Error",
        description: "Missing business or industry context.",
        variant: "destructive",
      });
      return;
    }
    try {
      // Update sort order for all pricing parameters
      const updates: Array<{ id: string; sort_order: number }> = [];
      Object.values(allRows).forEach((rows) => {
        rows.forEach((row, index) => {
          updates.push({ id: row.id, sort_order: index });
        });
      });

      const response = await fetch("/api/pricing-parameters/reorder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          updates,
          industryId,
          businessId: currentBusiness.id,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update priority');
      }

      toast({
        title: "Success",
        description: "Priority updated successfully",
      });
    } catch (error) {
      console.error('Error updating priority:', error);
      toast({
        title: "Error",
        description: "Failed to update priority",
        variant: "destructive",
      });
    }
  };

  const renderOptionsTable = (categoryKey: string) => {
    const rows = allRows[categoryKey] || [];
    return (
      <div className="overflow-x-auto rounded-b-md border border-t-0 bg-background">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>Name</TableHead>
              <TableHead>Price</TableHead>
              <TableHead>Time</TableHead>
              <TableHead>Display</TableHead>
              <TableHead>Service Category</TableHead>
              <TableHead>Frequency</TableHead>
              <TableHead className="whitespace-nowrap">ID</TableHead>
              <TableHead className="text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center text-sm text-muted-foreground py-10">
                  <p className="mb-3">{pageCopy.optEmptyTitle}</p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      router.push(
                        `/admin/settings/industries/form-1/pricing-parameter/new?industry=${encodeURIComponent(
                          industry
                        )}&industryId=${industryId}&category=${encodeURIComponent(categoryKey)}${scopeQs}`
                      )
                    }
                  >
                    {pageCopy.optEmptyBtn}
                  </Button>
                </TableCell>
              </TableRow>
            ) : (
              rows.map((r) => (
                <TableRow key={`${categoryKey}-${r.id}`}>
                  <TableCell className="font-medium">{r.name}</TableCell>
                  <TableCell>{formatParameterPrice(r.price)}</TableCell>
                  <TableCell>{formatParameterTimeMinutes(r.time_minutes)}</TableCell>
                  <TableCell className="text-xs">
                    {r.display ? (
                      <div className="whitespace-pre-line">{r.display.split(", ").join("\n")}</div>
                    ) : (
                      "—"
                    )}
                  </TableCell>
                  <TableCell>
                    {r.service_category ? (
                      <div className="whitespace-pre-line">
                        {r.service_category.split(", ").join("\n")}
                      </div>
                    ) : (
                      "—"
                    )}
                  </TableCell>
                  <TableCell>
                    {r.frequency ? (
                      <div className="whitespace-pre-line">{r.frequency.split(", ").join("\n")}</div>
                    ) : (
                      "—"
                    )}
                  </TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">{r.id}</TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="gap-1 text-muted-foreground">
                          Options <ChevronDown className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() =>
                            router.push(
                              `/admin/settings/industries/form-1/pricing-parameter/new?industry=${encodeURIComponent(
                                industry
                              )}&industryId=${industryId}&editId=${r.id}&category=${encodeURIComponent(categoryKey)}${scopeQs}`
                            )
                          }
                        >
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => move(categoryKey, r.id, -1)}>Move Up</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => move(categoryKey, r.id, 1)}>Move Down</DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => remove(categoryKey, r.id)}
                          className="text-red-600"
                        >
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {isForm2 ? (
        <TooltipProvider delayDuration={200}>
          <>
          <div className="rounded-xl border bg-card p-5 shadow-sm">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
              <div className="min-w-0 space-y-2 lg:max-w-2xl">
                <h2 className="text-lg font-semibold tracking-tight">{pageCopy.howItWorksTitle}</h2>
                <p className="text-sm text-muted-foreground leading-relaxed">{pageCopy.howItWorksBody}</p>
              </div>
              <div className="relative mx-auto flex aspect-video w-full max-w-[240px] shrink-0 items-center justify-center overflow-hidden rounded-lg border bg-gradient-to-br from-muted/80 to-muted lg:mx-0">
                <button
                  type="button"
                  className="relative z-10 flex h-14 w-14 items-center justify-center rounded-full border bg-background/95 text-foreground shadow-md transition hover:bg-background"
                  aria-label="Video overview (placeholder)"
                >
                  <Play className="h-7 w-7" fill="currentColor" />
                </button>
                <span className="sr-only">Video overview placeholder</span>
              </div>
            </div>
          </div>

          <Card>
            <CardHeader className="space-y-1 pb-2">
              <CardTitle>{industry} - Form 2 / Packages</CardTitle>
              <CardDescription>{pageCopy.cardDesc}</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
                    <Button variant="outline" size="sm" disabled>
                      Add New
                    </Button>
                  </div>
                  <div className="overflow-x-auto rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Name</TableHead>
                          <TableHead>Price</TableHead>
                          <TableHead>Time</TableHead>
                          <TableHead>Display</TableHead>
                          <TableHead className="whitespace-nowrap">ID</TableHead>
                          <TableHead className="text-right">Action</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        <TableRow>
                          <TableCell
                            colSpan={6}
                            className="text-center text-sm text-muted-foreground py-10"
                          >
                            {pageCopy.loadingLine}
                          </TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </div>
                </div>
              ) : allCategoryEntries.length === 0 ? (
                <div className="space-y-4 py-8 text-center">
                  <p className="text-sm text-muted-foreground max-w-md mx-auto">{pageCopy.emptyBlurb}</p>
                  <Button
                    variant="default"
                    onClick={() =>
                      router.push(
                        `/admin/settings/industries/form-1/pricing-parameter/manage-variables?industry=${encodeURIComponent(
                          industry,
                        )}${scopeQs}`,
                      )
                    }
                  >
                    {pageCopy.emptyCta}
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
                    <Button
                      variant="outline"
                      onClick={() =>
                        router.push(
                          `/admin/settings/industries/form-1/pricing-parameter/new?industry=${encodeURIComponent(
                            industry,
                          )}&industryId=${industryId}${scopeQs}`,
                        )
                      }
                    >
                      Add New
                    </Button>
                  </div>

                  <div className="overflow-x-auto rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Name</TableHead>
                          <TableHead>Price</TableHead>
                          <TableHead>Time</TableHead>
                          <TableHead>Display</TableHead>
                          <TableHead className="whitespace-nowrap">ID</TableHead>
                          <TableHead className="text-right">Action</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {form2FlatPackages.length === 0 ? (
                          <TableRow>
                            <TableCell
                              colSpan={6}
                              className="text-center text-sm text-muted-foreground py-10"
                            >
                              <p className="mb-3">{pageCopy.optEmptyTitle}</p>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() =>
                                  router.push(
                                    `/admin/settings/industries/form-1/pricing-parameter/new?industry=${encodeURIComponent(
                                      industry,
                                    )}&industryId=${industryId}${scopeQs}`,
                                  )
                                }
                              >
                                {pageCopy.optEmptyBtn}
                              </Button>
                            </TableCell>
                          </TableRow>
                        ) : (
                          form2FlatPackages.map(({ row: r, categoryKey }, idx) => (
                            <TableRow key={`${categoryKey}-${r.id}`}>
                              <TableCell className="font-medium">{r.name}</TableCell>
                              <TableCell>
                                <Form2PresetStack
                                  values={[
                                    formatParameterPrice(r.price),
                                    formatParameterPrice(
                                      r.price_merchant_location != null ? r.price_merchant_location : r.price,
                                    ),
                                  ]}
                                />
                              </TableCell>
                              <TableCell>
                                <Form2PresetStack
                                  values={[
                                    formatParameterTimeMinutes(r.time_minutes),
                                    formatParameterTimeMinutes(
                                      r.time_minutes_merchant_location != null
                                        ? r.time_minutes_merchant_location
                                        : r.time_minutes,
                                    ),
                                  ]}
                                />
                              </TableCell>
                              <TableCell className="text-sm">
                                {formatForm2PackageDisplay(r.display)}
                              </TableCell>
                              <TableCell
                                className="tabular-nums text-muted-foreground"
                                title={r.id}
                              >
                                {idx + 1}
                              </TableCell>
                              <TableCell className="text-right">
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="gap-1 text-muted-foreground"
                                    >
                                      Options <ChevronDown className="h-4 w-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    <DropdownMenuItem
                                      onClick={() =>
                                        router.push(
                                          `/admin/settings/industries/form-1/pricing-parameter/new?industry=${encodeURIComponent(
                                            industry,
                                          )}&industryId=${industryId}&editId=${r.id}&category=${encodeURIComponent(categoryKey)}${scopeQs}`,
                                        )
                                      }
                                    >
                                      Edit
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => move(categoryKey, r.id, -1)}>
                                      Move Up
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => move(categoryKey, r.id, 1)}>
                                      Move Down
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                      onClick={() => remove(categoryKey, r.id)}
                                      className="text-red-600"
                                    >
                                      Delete
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>

                  <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:items-center sm:justify-between">
                    <Button variant="default" className="w-fit" onClick={updatePriority}>
                      Update priority
                    </Button>
                    <Button
                      variant="secondary"
                      className="w-fit bg-orange-100 text-orange-900 hover:bg-orange-200/90 dark:bg-orange-950 dark:text-orange-100 dark:hover:bg-orange-900/80"
                      onClick={() =>
                        router.push(
                          `/admin/settings/industries/form-1/pricing-parameter/manage-variables?industry=${encodeURIComponent(
                            industry,
                          )}${scopeQs}`,
                        )
                      }
                    >
                      {pageCopy.manageLink}
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
          </>
        </TooltipProvider>
      ) : (
        <>
          <Card>
            <CardHeader className="flex flex-col gap-4 space-y-0 sm:flex-row sm:items-start sm:justify-between">
              <div className="space-y-1">
                <CardTitle>{pageCopy.cardTitle}</CardTitle>
                <CardDescription>{pageCopy.cardDesc}</CardDescription>
              </div>
              <div className="flex flex-wrap items-center gap-2 shrink-0">
                <Button
                  variant="outline"
                  onClick={() =>
                    router.push(
                      `/admin/settings/industries/form-1/pricing-parameter/new?industry=${encodeURIComponent(
                        industry,
                      )}&industryId=${industryId}${scopeQs}`,
                    )
                  }
                >
                  Add New
                </Button>
                <Button
                  variant="secondary"
                  className="bg-orange-100 text-orange-900 hover:bg-orange-200/90 dark:bg-orange-950 dark:text-orange-100 dark:hover:bg-orange-900/80"
                  onClick={() =>
                    router.push(
                      `/admin/settings/industries/form-1/pricing-parameter/manage-variables?industry=${encodeURIComponent(
                        industry,
                      )}${scopeQs}`,
                    )
                  }
                >
                  {pageCopy.manageLink}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="py-10 text-center text-sm text-muted-foreground">{pageCopy.loadingLine}</div>
              ) : allCategoryEntries.length === 0 ? (
                <div className="space-y-4 py-8 text-center">
                  <p className="text-sm text-muted-foreground max-w-md mx-auto">{pageCopy.emptyBlurb}</p>
                  <Button
                    variant="default"
                    onClick={() =>
                      router.push(
                        `/admin/settings/industries/form-1/pricing-parameter/manage-variables?industry=${encodeURIComponent(
                          industry,
                        )}${scopeQs}`,
                      )
                    }
                  >
                    {pageCopy.emptyCta}
                  </Button>
                </div>
              ) : visibleCategoryEntries.length === 0 ? (
                <div className="py-8 text-center text-sm text-muted-foreground">
                  No variables match this filter. Try <span className="font-medium">All</span> or{" "}
                  <span className="font-medium">Active</span>.
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-2">
                      <Label htmlFor="variable-activity-filter" className="text-sm text-muted-foreground shrink-0">
                        Show
                      </Label>
                      <Select
                        value={variableFilter}
                        onValueChange={(v) => setVariableFilter(v as "all" | "active" | "inactive")}
                      >
                        <SelectTrigger id="variable-activity-filter" className="w-[160px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">{pageCopy.filterAll}</SelectItem>
                          <SelectItem value="active">{pageCopy.filterActive}</SelectItem>
                          <SelectItem value="inactive">{pageCopy.filterInactive}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <p className="text-xs text-muted-foreground">{pageCopy.filterHelp}</p>
                  </div>

                  <div className="space-y-2">
                    {visibleCategoryEntries.map((c) => {
                      const optionCount = (allRows[c.key] || []).length;
                      const isOpen = openSections[c.key] ?? false;
                      return (
                        <Collapsible
                          key={c.key}
                          open={isOpen}
                          onOpenChange={(next) =>
                            setOpenSections((prev) => ({ ...prev, [c.key]: next }))
                          }
                          className="rounded-lg border bg-card shadow-sm"
                        >
                          <CollapsibleTrigger
                            className={`flex w-full items-center justify-between gap-3 px-4 py-3 text-left font-medium transition-colors hover:bg-muted/40 ${
                              isOpen ? "rounded-t-lg rounded-b-none" : "rounded-lg"
                            }`}
                          >
                            <span className="flex flex-col items-start gap-0.5 sm:flex-row sm:items-center sm:gap-2 sm:flex-wrap">
                              <span className="flex items-center gap-2 flex-wrap">
                                {c.label}
                                {c.fromVariable && !c.isActive ? (
                                  <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-900 dark:border-amber-800 dark:bg-amber-950/60 dark:text-amber-100">
                                    Inactive
                                  </span>
                                ) : null}
                              </span>
                              <span className="text-xs font-normal text-muted-foreground">
                                {optionCount === 0
                                  ? "No options yet"
                                  : `${optionCount} option${optionCount === 1 ? "" : "s"}`}
                                {!c.fromVariable ? pageCopy.orphanNote : null}
                              </span>
                            </span>
                            <span
                              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-muted-foreground/25 text-muted-foreground transition-colors hover:border-muted-foreground/40"
                              aria-hidden
                            >
                              {isOpen ? (
                                <Minus className="h-4 w-4" />
                              ) : (
                                <Plus className="h-4 w-4" />
                              )}
                            </span>
                          </CollapsibleTrigger>
                          <CollapsibleContent>{renderOptionsTable(c.key)}</CollapsibleContent>
                        </Collapsible>
                      );
                    })}
                  </div>

                  <div className="flex justify-center pt-2">
                    <Button variant="default" className="min-w-[200px]" onClick={updatePriority}>
                      Update priority
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Exclude Parameters Section */}
          <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Exclude Parameters</CardTitle>
              <CardDescription>Manage exclude parameters for {industry}.</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button 
                variant="outline" 
                onClick={() => router.push(`/admin/settings/industries/form-1/pricing-parameter/exclude-parameters/new?industry=${encodeURIComponent(industry)}&industryId=${industryId}`)}
              >
                Add New
              </Button>
              <Button variant="default" onClick={updatePriority}>
                Update priority
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Time</TableHead>
                  <TableHead>Display</TableHead>
                  <TableHead>Service Category</TableHead>
                  <TableHead>Frequency</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {excludeParameters.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-sm text-muted-foreground">
                      No exclude parameters configured. Click "Add New" to add parameters.
                    </TableCell>
                  </TableRow>
                ) : (
                  excludeParameters.map((param) => (
                    <TableRow key={param.id}>
                      <TableCell className="font-medium">{param.name}</TableCell>
                      <TableCell>${param.price ? param.price.toFixed(2) : "-"}</TableCell>
                      <TableCell>{param.time_minutes > 0 ? `${Math.floor(param.time_minutes / 60)}Hr ${param.time_minutes % 60}Min` : '0'}</TableCell>
                      <TableCell className="text-xs">
                                {param.display ? (
                                  <div className="whitespace-pre-line">
                                    {param.display.split(', ').join('\n')}
                                  </div>
                                ) : "-"}
                              </TableCell>
                      <TableCell>
                                {param.service_category ? (
                                  <div className="whitespace-pre-line">
                                    {param.service_category.split(', ').join('\n')}
                                  </div>
                                ) : "-"}
                              </TableCell>
                      <TableCell>
                                {param.frequency ? (
                                  <div className="whitespace-pre-line">
                                    {param.frequency.split(', ').join('\n')}
                                  </div>
                                ) : "-"}
                              </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="gap-1 text-muted-foreground">
                              Options <ChevronDown className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => router.push(`/admin/settings/industries/form-1/pricing-parameter/exclude-parameters/new?industry=${encodeURIComponent(industry)}&industryId=${industryId}&editId=${param.id}`)}
                            >
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={async () => {
                                try {
                                  const response = await fetch(`/api/exclude-parameters?id=${param.id}`, {
                                    method: 'DELETE',
                                  });
                                  if (!response.ok) throw new Error('Failed to delete');
                                  setExcludeParameters(excludeParameters.filter(p => p.id !== param.id));
                                  toast({
                                    title: "Success",
                                    description: "Exclude parameter deleted successfully",
                                  });
                                } catch (error) {
                                  toast({
                                    title: "Error",
                                    description: "Failed to delete exclude parameter",
                                    variant: "destructive",
                                  });
                                }
                              }}
                              className="text-red-600"
                            >
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
        </>
      )}
    </div>
  );
}
