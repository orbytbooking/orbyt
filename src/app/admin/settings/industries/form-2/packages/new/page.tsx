"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useBusiness } from "@/contexts/BusinessContext";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Info, Loader2 } from "lucide-react";
import {
  bookingFormScopeFromSearchParams,
  FORM2_STANDALONE_PACKAGE_CATEGORY,
} from "@/lib/bookingFormScope";
import { form2AddonsListUrl } from "@/lib/form2AddonsApi";
import { form2ExtrasListUrl } from "@/lib/form2ExtrasApi";
import { cn } from "@/lib/utils";
import { Form1RichTextEditor } from "@/components/admin/Form1RichTextEditor";
import { INDUSTRY_FORM_ICON_PRESETS, bookingFormPresetIconTextClass, industryFormIconIsImageSrc } from "@/lib/industryExtraIcons";
import {
  IndustryFormPresetIcon,
  industryFormIconPickerButtonClass,
} from "@/components/industry/IndustryFormPresetIcon";
import {
  form2PackagesShareItemScope,
  isForm2PackageItemSelectValid,
  normalizeForm2ItemSelectToId,
  resolveForm2PackageItemSelectValue,
} from "@/lib/form2PackageItemLink";

type PricingVariable = {
  id: string;
  name: string;
  category: string;
  description: string;
  isActive: boolean;
  sortOrder: number;
};

const DEFAULT_BEDROOM_TIER_NAMES_FOR_DEPS = [
  "Studio",
  "1 Bedroom",
  "2 Bedrooms",
  "3 Bedrooms",
  "4 Bedrooms",
  "5 Bedrooms",
  "6 Bedrooms",
] as const;

const FORM2_HOUR_OPTIONS = Array.from({ length: 24 }, (_, i) => String(i));
const FORM2_MINUTE_OPTIONS = Array.from({ length: 60 }, (_, i) => String(i));

function inferForm4PresetVariable(industryName: string): string {
  const key = industryName.trim().toLowerCase();
  if (!key) return "Unit";
  if (/(clean|pool|wash|paint|window|floor|carpet|tile|janitor)/i.test(key)) return "Square Footage";
  if (/(lawn|landscape|yard|garden)/i.test(key)) return "Square Footage";
  if (/(moving|relocation)/i.test(key)) return "Rooms";
  if (/(junk|haul|dumpster)/i.test(key)) return "Load Size";
  if (/(pet|groom)/i.test(key)) return "Pet Count";
  return "Unit";
}

function OrangeInfoTip({ text }: { text: string }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          className="inline-flex shrink-0 rounded-full text-orange-600 outline-none hover:text-orange-700 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 dark:text-orange-400"
          aria-label="More information"
        >
          <Info className="h-4 w-4" />
        </button>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-sm text-left text-xs font-normal leading-snug">
        {text}
      </TooltipContent>
    </Tooltip>
  );
}

export default function PricingParameterNewPage() {
  const params = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const industry = params.get("industry") || "Industry";
  const industryId = params.get("industryId");
  const editId = params.get("editId");
  const editCategory = params.get("category") || "";
  const bookingFormScope = bookingFormScopeFromSearchParams(params.get("bookingFormScope"), pathname);
  const scopeQs = `&bookingFormScope=${bookingFormScope}`;
  const isForm2 = bookingFormScope === "form2";
  const isForm4 = bookingFormScope === "form4";
  const packagesBasePath = isForm2
    ? "/admin/settings/industries/form-2/packages"
    : "/admin/settings/industries/form-2/pricing-parameter";
  const { currentBusiness } = useBusiness();
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const freqCatDepsDoneForIndustry = useRef<string | null>(null);
  const excludeDepsPrefilledForIndustry = useRef<string | null>(null);
  const prevEditIdRef = useRef<string | null | undefined>(undefined);
  const pendingEditPackageRef = useRef<{
    pricing_variable_id?: string | null;
    variable_category?: string | null;
    name?: string | null;
  } | null>(null);
  const editLoadSeqRef = useRef(0);
  const [editLoading, setEditLoading] = useState(false);

  const [variables, setVariables] = useState<PricingVariable[]>([]);
  const variablesRef = useRef<PricingVariable[]>([]);
  const [extras, setExtras] = useState<Array<{id: number; name: string; listing_kind?: string}>>([]);
  const [services, setServices] = useState<Array<{id: number; name: string}>>([]);
  const [providers, setProviders] = useState<Array<{ id: string; name: string }>>([]);
  const [serviceCategories, setServiceCategories] = useState<Array<{ id: number; name: string }>>([]);
  const [frequencies, setFrequencies] = useState<Array<{ id: number; name: string }>>([]);
  const [excludeParameters, setExcludeParameters] = useState<Array<{ id: string; name: string; description: string }>>([]);

  const [form, setForm] = useState({
    variableCategory: "",
    /** Form 2: item id this package belongs to (industry_form2_items.id). */
    pricingVariableId: "" as string,
    name: "",
    description: "",
    display: "Customer Frontend, Backend & Admin" as "Customer Frontend, Backend & Admin" | "Customer Backend & Admin" | "Admin Only",
    price: "",
    hours: "",
    minutes: "",
    isDefault: false,
    showBasedOnFrequency: false,
    showBasedOnServiceCategory: false,
    showBasedOnServiceCategory2: false,
    excludedExtras: [] as number[],
    excludedServices: [] as number[],
    excludedProviders: [] as string[],
    excludeParameters: [] as string[],
    serviceCategory: [] as string[],
    serviceCategory2: [] as string[],
    frequency: [] as string[],
    // UI-only (match design; not in API yet)
    differentOnCustomerEnd: false,
    showExplanationIcon: false,
    enablePopupOnSelection: false,
    /** Form 2: M.L. price/time (S.A. uses price, hours, minutes above). */
    priceMerchant: "",
    hoursMerchant: "",
    minutesMerchant: "",
    quantityBased: false,
    /** Preset key (from INDUSTRY_FORM_ICON_PRESETS) or uploaded image data URL */
    packageIcon: "" as string,
  });

  const [existingParameters, setExistingParameters] = useState<any[]>([]);
  const [showAddVariableDialog, setShowAddVariableDialog] = useState(false);
  const [newVariableCategoryName, setNewVariableCategoryName] = useState("");
  const [addingVariable, setAddingVariable] = useState(false);
  const [showIconDialog, setShowIconDialog] = useState(false);

  const [validationErrors, setValidationErrors] = useState({
    variableCategory: "",
    name: "",
    price: "",
    hours: "",
    minutes: "",
  });

  // Load extras from backend
  useEffect(() => {
    const fetchExtras = async () => {
      if (!industryId) return;
      
      try {
        const businessId = currentBusiness?.id ?? "";
        const listUrls = isForm2
          ? [form2AddonsListUrl(industryId, businessId), form2ExtrasListUrl(industryId, businessId)]
          : [`/api/extras?industryId=${industryId}&businessId=${businessId}${scopeQs}`];
        const payloads = await Promise.all(
          listUrls.map((u) => fetch(u).then((r) => (r.ok ? r.json() : { extras: [], addons: [] }))),
        );
        const rows = payloads.flatMap((data) =>
          Array.isArray(data.addons) ? data.addons : Array.isArray(data.extras) ? data.extras : [],
        );
        if (rows.length > 0) {
          setExtras(
            rows.map((e: any) => ({
              id: e.id,
              name: e.name,
              listing_kind: e.listing_kind ? String(e.listing_kind) : undefined,
            })),
          );
        } else {
          setExtras([]);
        }
      } catch (error) {
        console.error('Error fetching extras:', error);
        setExtras([]);
      }
    };

    fetchExtras();
  }, [industryId, bookingFormScope, isForm2, currentBusiness?.id, scopeQs]);

  // Load service categories from backend
  useEffect(() => {
    const fetchServiceCategories = async () => {
      if (!industryId) return;
      
      try {
        const response = await fetch(
          `/api/service-categories?industryId=${industryId}&businessId=${encodeURIComponent(currentBusiness?.id ?? "")}${scopeQs}`,
        );
        if (!response.ok) {
          throw new Error('Failed to fetch service categories');
        }
        const data = await response.json();
        
        if (data.serviceCategories && Array.isArray(data.serviceCategories)) {
          setServices(data.serviceCategories.map((s: any) => ({ id: s.id, name: s.name })));
          setServiceCategories(data.serviceCategories.map((s: any) => ({ id: s.id, name: s.name })));
          console.log("Loaded service categories from backend:", data.serviceCategories);
        } else {
          setServices([]);
          setServiceCategories([]);
        }
      } catch (error) {
        console.error('Error fetching service categories:', error);
        setServices([]);
        setServiceCategories([]);
      }
    };

    fetchServiceCategories();
  }, [industryId, bookingFormScope]);

  // Load frequencies from backend
  useEffect(() => {
    const fetchFrequencies = async () => {
      if (!industryId) return;
      
      try {
        const response = await fetch(
          `/api/industry-frequency?industryId=${industryId}&businessId=${encodeURIComponent(currentBusiness?.id ?? "")}&includeAll=true${scopeQs}`,
        );
        if (!response.ok) {
          throw new Error('Failed to fetch frequencies');
        }
        const data = await response.json();
        
        if (data.frequencies && Array.isArray(data.frequencies)) {
          setFrequencies(data.frequencies.map((f: any) => ({ id: f.id, name: f.name })));
          console.log("Loaded frequencies from backend:", data.frequencies);
        } else {
          setFrequencies([]);
        }
      } catch (error) {
        console.error('Error fetching frequencies:', error);
        setFrequencies([]);
      }
    };

    fetchFrequencies();
  }, [industryId, bookingFormScope]);

  // Load providers from backend
  useEffect(() => {
    const fetchProviders = async () => {
      if (!currentBusiness?.id) return;
      
      try {
        const response = await fetch(`/api/admin/providers?businessId=${currentBusiness.id}`);
        if (!response.ok) {
          throw new Error('Failed to fetch providers');
        }
        const data = await response.json();
        
        if (data.providers && Array.isArray(data.providers)) {
          setProviders(data.providers.map((p: any) => ({ id: p.id, name: p.name })));
        } else {
          setProviders([]);
        }
      } catch (error) {
        console.error('Error fetching providers:', error);
        setProviders([]);
      }
    };

    fetchProviders();
  }, [currentBusiness?.id]);

  const fetchVariables = useCallback(async () => {
    if (!industryId || !currentBusiness?.id) return;
    try {
      const res = await fetch(
        `/api/pricing-variables?industryId=${encodeURIComponent(industryId)}&businessId=${encodeURIComponent(currentBusiness.id)}${scopeQs}`,
      );
      const data = await res.json();
      if (res.ok && Array.isArray(data.variables)) {
        setVariables(
          data.variables.map((v: any) => ({
            id: v.id,
            name: v.name,
            category: v.category,
            description: v.description ?? "",
            isActive: v.is_active ?? true,
            sortOrder: typeof v.sort_order === "number" ? v.sort_order : 0,
          })),
        );
      }
    } catch (e) {
      console.error("Error loading variables:", e);
    }
  }, [industryId, bookingFormScope, currentBusiness?.id]);

  // Load variables from API (no localStorage)
  useEffect(() => {
    fetchVariables();
  }, [fetchVariables]);

  useEffect(() => {
    variablesRef.current = variables;
  }, [variables]);

  const applyForm2PackageItemToForm = useCallback(() => {
    const pending = pendingEditPackageRef.current;
    if (!pending) return;
    const resolved = normalizeForm2ItemSelectToId(
      resolveForm2PackageItemSelectValue({
        pricingVariableId: pending.pricing_variable_id,
        variableCategory: pending.variable_category,
        packageName: pending.name,
        variables: variablesRef.current,
        urlCategory: editCategory,
      }),
      variablesRef.current,
      pending.name,
    );
    if (!resolved) return;
    setForm((p) => (p.variableCategory === resolved ? p : { ...p, variableCategory: resolved }));
    setValidationErrors((prev) => ({
      ...prev,
      variableCategory: isForm2PackageItemSelectValid(resolved, variablesRef.current) ? "" : "Item is required",
      name: "",
    }));
  }, [editCategory]);

  // Refetch variables when user returns from "Add Variable Category" (e.g. new tab)
  useEffect(() => {
    const onVisibilityChange = () => {
      if (document.visibilityState === "visible" && industryId) fetchVariables();
    };
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => document.removeEventListener("visibilitychange", onVisibilityChange);
  }, [industryId, fetchVariables]);

  // Load exclude parameters from backend
  useEffect(() => {
    if (isForm2 || isForm4) {
      setExcludeParameters([]);
      return;
    }
    const fetchExcludeParameters = async () => {
      if (!industryId) return;
      
      console.log('🔍 EXCLUDE PARAMETERS DEBUG');
      console.log('📥 industryId:', industryId);
      
      try {
        const response = await fetch(`/api/exclude-parameters?industryId=${industryId}`);
        console.log('📡 Response status:', response.status);
        console.log('📡 Response ok:', response.ok);
        
        if (!response.ok) {
          const errorText = await response.text();
          console.log('❌ Error response:', errorText);
          throw new Error('Failed to fetch exclude parameters');
        }
        
        const data = await response.json();
        console.log('📦 Raw API response:', data);
        console.log('📦 data.excludeParameters:', data.excludeParameters);
        console.log('📦 Array.isArray(data.excludeParameters):', Array.isArray(data.excludeParameters));
        
        if (data.excludeParameters && Array.isArray(data.excludeParameters)) {
          console.log('✅ Found exclude parameters array with', data.excludeParameters.length, 'items');
          data.excludeParameters.forEach((param: any, index: number) => {
            console.log(`  ${index + 1}.`, param);
          });
          
          setExcludeParameters(data.excludeParameters.map((p: any) => ({ 
            id: p.id, 
            name: p.name, 
            description: p.description || "" 
          })));
          console.log("✅ Loaded exclude parameters from backend:", data.excludeParameters);
        } else {
          console.log('❌ No exclude parameters found or invalid format');
          setExcludeParameters([]);
        }
      } catch (error) {
        console.error('💥 Error fetching exclude parameters:', error);
        setExcludeParameters([]);
      }
    };

    fetchExcludeParameters();
  }, [industryId, isForm2, isForm4]);

  // Industry-wide list: duplicate-name checks (always from API)
  useEffect(() => {
    if (!industryId || !currentBusiness?.id) return;

    const loadList = async () => {
      try {
        const response = await fetch(
          `/api/pricing-parameters?industryId=${encodeURIComponent(industryId)}&businessId=${encodeURIComponent(currentBusiness.id)}${scopeQs}`,
        );
        const data = await response.json();
        setExistingParameters(Array.isArray(data.pricingParameters) ? data.pricingParameters : []);
      } catch (error) {
        console.error("Error fetching pricing parameters:", error);
        setExistingParameters([]);
      }
    };

    loadList();
  }, [industryId, currentBusiness?.id, bookingFormScope]);

  useEffect(() => {
    freqCatDepsDoneForIndustry.current = null;
    excludeDepsPrefilledForIndustry.current = null;
  }, [industryId]);

  useEffect(() => {
    if (prevEditIdRef.current && !editId) {
      freqCatDepsDoneForIndustry.current = null;
      excludeDepsPrefilledForIndustry.current = null;
    }
    prevEditIdRef.current = editId;
  }, [editId]);

  useEffect(() => {
    if (editId || !editCategory.trim()) return;
    setForm((p) => (p.variableCategory === editCategory ? p : { ...p, variableCategory: editCategory }));
    setValidationErrors((prev) => ({ ...prev, variableCategory: validateVariableCategory(editCategory) }));
  }, [editId, editCategory]);

  /** Form 2: packages without `?category=` use a shared standalone bucket so the Details tab does not require picking an item. */
  useEffect(() => {
    if (!isForm2 || editId) return;
    if (editCategory.trim()) return;
    setForm((p) => {
      if (p.variableCategory.trim()) return p;
      return { ...p, variableCategory: FORM2_STANDALONE_PACKAGE_CATEGORY };
    });
    setValidationErrors((prev) => ({ ...prev, variableCategory: "" }));
  }, [isForm2, editId, editCategory]);

  // Non–Form 2: new package dependency radios default to Yes with all frequencies/categories/items selected.
  useEffect(() => {
    if (editId || isForm2) return;
    if (!industryId || !frequencies.length || !serviceCategories.length) return;
    if (freqCatDepsDoneForIndustry.current === industryId) return;
    freqCatDepsDoneForIndustry.current = industryId;

    const bedTiers = existingParameters
      .filter((p: { variable_category?: string }) => (p.variable_category || "") === "Bedroom")
      .map((p: { name?: string }) => String(p.name ?? "").trim())
      .filter(Boolean);
    const serviceCategory2FromVars = variables
      .map((v) => String(v.name ?? "").trim())
      .filter(Boolean);
    const serviceCategory2 = isForm2
      ? serviceCategory2FromVars.length > 0
        ? serviceCategory2FromVars
        : [...DEFAULT_BEDROOM_TIER_NAMES_FOR_DEPS]
      : bedTiers.length
        ? bedTiers
        : [...DEFAULT_BEDROOM_TIER_NAMES_FOR_DEPS];

    setForm((p) => ({
      ...p,
      showBasedOnFrequency: true,
      showBasedOnServiceCategory: true,
      showBasedOnServiceCategory2: true,
      frequency: frequencies.map((f) => f.name),
      serviceCategory: serviceCategories.map((c) => c.name),
      serviceCategory2,
    }));
  }, [editId, industryId, frequencies, serviceCategories, existingParameters, isForm2, variables]);

  useEffect(() => {
    if (editId) return;
    if (isForm2) return;
    if (!industryId || !excludeParameters.length) return;
    if (excludeDepsPrefilledForIndustry.current === industryId) return;
    excludeDepsPrefilledForIndustry.current = industryId;
    setForm((p) => ({ ...p, excludeParameters: excludeParameters.map((ep) => ep.id) }));
  }, [editId, industryId, excludeParameters, isForm2]);

  const mapExistingToForm = useCallback(
    (existing: Record<string, unknown>) => {
      const row = existing as {
        pricing_variable_id?: string | null;
        variable_category?: string;
        name?: string;
        description?: string;
        display?: "Customer Frontend, Backend & Admin" | "Customer Backend & Admin" | "Admin Only";
        price?: number;
        time_minutes?: number;
        is_default?: boolean;
        show_based_on_frequency?: boolean;
        show_based_on_service_category?: boolean;
        show_based_on_service_category2?: boolean;
        excluded_extras?: unknown[];
        excluded_services?: unknown[];
        excluded_providers?: string[];
        exclude_parameters?: string[];
        service_category?: string;
        service_category2?: string;
        frequency?: string;
        price_merchant_location?: number | null;
        time_minutes_merchant_location?: number | null;
        quantity_based?: boolean;
        icon?: string | null;
      };

      const timeMinutes = Number(row.time_minutes ?? 0);
      const hours = Math.floor(timeMinutes / 60);
      const minutes = timeMinutes % 60;
      const mlMinsRaw =
        row.time_minutes_merchant_location != null ? row.time_minutes_merchant_location : timeMinutes;
      const mlHours = Math.floor(mlMinsRaw / 60);
      const mlMinutes = mlMinsRaw % 60;
      const mlPrice = row.price_merchant_location != null ? row.price_merchant_location : row.price;

      const pendingItem = {
        pricing_variable_id: row.pricing_variable_id ?? null,
        variable_category: row.variable_category,
        name: row.name,
      };
      pendingEditPackageRef.current = pendingItem;

      const resolvedItemForForm = isForm2
        ? normalizeForm2ItemSelectToId(
            resolveForm2PackageItemSelectValue({
              pricingVariableId: pendingItem.pricing_variable_id,
              variableCategory: pendingItem.variable_category,
              packageName: pendingItem.name,
              variables: variablesRef.current,
              urlCategory: editCategory,
            }),
            variablesRef.current,
            pendingItem.name,
          )
        : String(row.variable_category ?? "");

      const toNumIds = (arr: unknown[] | undefined) =>
        (arr ?? [])
          .map((x) => Number(x))
          .filter((n) => Number.isFinite(n));

      return {
        variableCategory: isForm2 ? resolvedItemForForm : String(row.variable_category ?? ""),
        pricingVariableId: typeof row.pricing_variable_id === "string" ? row.pricing_variable_id : "",
        name: String(row.name ?? ""),
        description: String(row.description ?? ""),
        display: row.display ?? "Customer Frontend, Backend & Admin",
        price: String(row.price ?? 0),
        hours: String(hours),
        minutes: String(minutes),
        isDefault: !!row.is_default,
        showBasedOnFrequency: !!row.show_based_on_frequency,
        showBasedOnServiceCategory: !!row.show_based_on_service_category,
        showBasedOnServiceCategory2: !!row.show_based_on_service_category2,
        excludedExtras: toNumIds(row.excluded_extras),
        excludedServices: toNumIds(row.excluded_services),
        excludedProviders: row.excluded_providers ?? [],
        excludeParameters: row.exclude_parameters ?? [],
        serviceCategory: row.service_category ? row.service_category.split(", ") : [],
        serviceCategory2: row.service_category2 ? row.service_category2.split(", ") : [],
        frequency: row.frequency ? row.frequency.split(", ") : [],
        differentOnCustomerEnd: false,
        showExplanationIcon: false,
        enablePopupOnSelection: false,
        priceMerchant: String(mlPrice ?? 0),
        hoursMerchant: String(mlHours),
        minutesMerchant: String(mlMinutes),
        quantityBased: !!row.quantity_based,
        packageIcon: typeof row.icon === "string" ? row.icon : "",
      };
    },
    [isForm2, editCategory],
  );

  // Single row for edit (authoritative; always refetch when editId changes)
  useEffect(() => {
    if (!editId || !industryId || !currentBusiness?.id) return;

    const seq = ++editLoadSeqRef.current;
    setEditLoading(true);
    pendingEditPackageRef.current = null;

    const loadOne = async () => {
      try {
        const response = await fetch(
          `/api/pricing-parameters?id=${encodeURIComponent(editId)}&industryId=${encodeURIComponent(industryId)}&businessId=${encodeURIComponent(currentBusiness.id)}${scopeQs}`,
          { cache: "no-store" },
        );
        const data = await response.json();

        if (seq !== editLoadSeqRef.current) return;

        if (!response.ok || !data.pricingParameter) {
          toast({
            title: "Error",
            description: data.error || "Failed to load pricing parameter",
            variant: "destructive",
          });
          return;
        }

        setForm(mapExistingToForm(data.pricingParameter as Record<string, unknown>));
        if (isForm2) {
          setValidationErrors({
            variableCategory: "",
            name: "",
            price: "",
            hours: "",
            minutes: "",
          });
        }
      } catch (error) {
        if (seq !== editLoadSeqRef.current) return;
        console.error("Error fetching pricing parameter for edit:", error);
        toast({
          title: "Error",
          description: "Failed to load pricing parameter data",
          variant: "destructive",
        });
      } finally {
        if (seq === editLoadSeqRef.current) setEditLoading(false);
      }
    };

    void loadOne();
  }, [editId, industryId, currentBusiness?.id, toast, scopeQs, isForm2, mapExistingToForm]);

  // Refetch when returning via browser back/forward cache
  useEffect(() => {
    if (!editId || !industryId || !currentBusiness?.id) return;
    const onPageShow = (event: PageTransitionEvent) => {
      if (!event.persisted) return;
      editLoadSeqRef.current += 1;
      const seq = editLoadSeqRef.current;
      setEditLoading(true);
      void (async () => {
        try {
          const response = await fetch(
            `/api/pricing-parameters?id=${encodeURIComponent(editId)}&industryId=${encodeURIComponent(industryId)}&businessId=${encodeURIComponent(currentBusiness.id)}${scopeQs}`,
            { cache: "no-store" },
          );
          const data = await response.json();
          if (seq !== editLoadSeqRef.current || !response.ok || !data.pricingParameter) return;
          setForm(mapExistingToForm(data.pricingParameter as Record<string, unknown>));
        } finally {
          if (seq === editLoadSeqRef.current) setEditLoading(false);
        }
      })();
    };
    window.addEventListener("pageshow", onPageShow);
    return () => window.removeEventListener("pageshow", onPageShow);
  }, [editId, industryId, currentBusiness?.id, scopeQs, mapExistingToForm]);

  // Form 2 edit: re-resolve item id when items list loads (avoids stale closure from async fetch).
  useEffect(() => {
    if (!isForm2 || !editId || variables.length === 0) return;
    applyForm2PackageItemToForm();
  }, [isForm2, editId, variables, applyForm2PackageItemToForm]);

  useEffect(() => {
    if (editId || !isForm4) return;
    const preset = inferForm4PresetVariable(industry);
    setForm((p) => ({
      ...p,
      variableCategory: p.variableCategory.trim() || preset,
      name: p.name.trim() || (p.variableCategory.trim() || preset),
      quantityBased: true,
    }));
    setValidationErrors((prev) => ({ ...prev, variableCategory: "" }));
  }, [editId, isForm4, industry]);

  // Real-time validation for variable category
  const validateVariableCategory = (value: string) => {
    if (isForm2) {
      return isForm2PackageItemSelectValid(value, variables) ? "" : "Item is required";
    }
    if (!value.trim()) return "Variable category is required";
    return "";
  };

  const effectiveForm2ItemSelect = useMemo(() => {
    if (!isForm2) return form.variableCategory;
    const raw =
      isForm2PackageItemSelectValid(form.variableCategory, variables) &&
      variables.some((row) => String(row.id) === form.variableCategory.trim())
        ? form.variableCategory.trim()
        : resolveForm2PackageItemSelectValue({
            pricingVariableId: form.pricingVariableId || pendingEditPackageRef.current?.pricing_variable_id,
            variableCategory: form.variableCategory || pendingEditPackageRef.current?.variable_category,
            packageName: form.name || pendingEditPackageRef.current?.name,
            variables,
            urlCategory: editCategory,
          });
    return normalizeForm2ItemSelectToId(raw, variables, form.name || pendingEditPackageRef.current?.name);
  }, [isForm2, form.variableCategory, form.pricingVariableId, form.name, variables, editCategory]);

  const form2ItemSelectValue = useMemo(() => {
    if (!isForm2) return form.variableCategory;
    const raw = form.variableCategory.trim() || effectiveForm2ItemSelect;
    return normalizeForm2ItemSelectToId(raw, variables, form.name);
  }, [isForm2, form.variableCategory, effectiveForm2ItemSelect, variables, form.name]);

  const form2ItemSelectReady = useMemo(() => {
    if (!isForm2) return true;
    if (effectiveForm2ItemSelect === FORM2_STANDALONE_PACKAGE_CATEGORY) return true;
    return (
      variables.some((row) => String(row.id) === effectiveForm2ItemSelect) &&
      isForm2PackageItemSelectValid(effectiveForm2ItemSelect, variables)
    );
  }, [isForm2, effectiveForm2ItemSelect, variables]);

  const addVariableCategoryInline = async () => {
    const name = newVariableCategoryName.trim();
    if (!name) {
      toast({ title: "Error", description: "Enter a category name", variant: "destructive" });
      return;
    }
    if (!industryId || !currentBusiness?.id) {
      toast({ title: "Error", description: "Industry or business not loaded.", variant: "destructive" });
      return;
    }
    if (variables.some((v) => (v.category || v.name).toLowerCase() === name.toLowerCase())) {
      toast({ title: "Already exists", description: "This variable category already exists.", variant: "destructive" });
      return;
    }
    setAddingVariable(true);
    try {
      const updatedList = [
        ...variables.map((v) => ({
          id: v.id.startsWith("temp-") ? undefined : v.id,
          name: v.name,
          category: v.category,
          description: v.description || "",
          is_active: v.isActive,
        })),
        { name, category: name, description: "", is_active: true },
      ];
      const res = await fetch("/api/pricing-variables", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          industryId,
          businessId: currentBusiness.id,
          bookingFormScope,
          variables: updatedList,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to add variable");
      const list = (data.variables ?? []).map((v: any) => ({
        id: v.id,
        name: v.name ?? v.category ?? "",
        category: v.category ?? v.name ?? "",
        description: v.description ?? "",
        isActive: v.is_active ?? true,
        sortOrder: typeof v.sort_order === "number" ? v.sort_order : 0,
      }));
      setVariables(list);
      setForm((p) => ({ ...p, variableCategory: name }));
      setValidationErrors((prev) => ({ ...prev, variableCategory: "" }));
      setNewVariableCategoryName("");
      setShowAddVariableDialog(false);
      toast({ title: "Variable category added", description: `"${name}" is now available in the list.` });
    } catch (e) {
      console.error(e);
      toast({ title: "Error", description: "Failed to add variable category", variant: "destructive" });
    } finally {
      setAddingVariable(false);
    }
  };

  // Real-time validation for name
  const findDuplicateParameterForName = (rawName: string) => {
    const candidateName = rawName.trim().toLowerCase();
    if (!candidateName) return undefined;
    const serviceCategoryValue = form.showBasedOnServiceCategory ? form.serviceCategory.join(", ") : "";
    return existingParameters.find((p: any) => {
      if (!isForm2 && p.variable_category !== form.variableCategory) {
        return false;
      }
      if (String(p.name ?? "").toLowerCase() !== candidateName) return false;
      if (p.id === editId) return false;
      const pSc = String(p.service_category ?? "").trim();
      const formSc = serviceCategoryValue.trim();
      if (form.showBasedOnServiceCategory && Boolean(p.show_based_on_service_category)) {
        return pSc === formSc;
      }
      if (form.showBasedOnServiceCategory !== Boolean(p.show_based_on_service_category)) return false;
      return true;
    });
  };

  const validateName = (value: string) => {
    if (!value.trim()) {
      return isForm2 ? "This field cannot be left empty" : "Name is required";
    }

    const itemScopeReady = isForm2 ? true : Boolean(form.variableCategory.trim());
    if (itemScopeReady) {
      const duplicate = findDuplicateParameterForName(value);

      if (duplicate) {
        if (isForm2) {
          return "A package with this name already exists. Choose a different name.";
        }
        return `A parameter with this name already exists in "${form.variableCategory}" category`;
      }
    }

    return "";
  };

  // After item id resolves on edit, clear false duplicate-name errors from category-wide scope.
  useEffect(() => {
    if (!isForm2 || !editId || !form2ItemSelectReady) return;
    setValidationErrors((prev) => {
      if (!prev.name && !prev.variableCategory) return prev;
      return {
        ...prev,
        variableCategory: "",
        name: form.name.trim() ? validateName(form.name) : "",
      };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- revalidate when item link becomes an id
  }, [isForm2, editId, form2ItemSelectReady, form2ItemSelectValue]);

  // Real-time validation for price
  const validatePrice = (value: string) => {
    if (!value.trim()) {
      return "Price is required";
    }
    const numValue = Number(value);
    if (isNaN(numValue)) {
      return "Price must be a valid number";
    }
    if (numValue < 0) {
      return "Price cannot be negative";
    }
    return "";
  };

  // Real-time validation for hours
  const validateHours = (value: string, minutesValue: string) => {
    if (value.trim()) {
      const numValue = Number(value);
      if (isNaN(numValue)) {
        return "Hours must be a valid number";
      }
      if (numValue < 0) {
        return "Hours cannot be negative";
      }
    }
    return "";
  };

  // Real-time validation for minutes
  const validateMinutes = (value: string, hoursValue: string) => {
    if (value.trim()) {
      const numValue = Number(value);
      if (isNaN(numValue)) {
        return "Minutes must be a valid number";
      }
      if (numValue < 0 || numValue > 59) {
        return "Minutes must be between 0 and 59";
      }
    }
    return "";
  };

  const renderForm2ItemSelect = () => (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Label htmlFor="f2-item">Item</Label>
        <OrangeInfoTip text="Which item this package belongs to. Preset packages are linked to a specific item (for example Bedroom 1 or Sq Ft 2)." />
      </div>
      <Select
        value={form2ItemSelectValue || undefined}
        onValueChange={(value) => {
          setForm((p) => ({ ...p, variableCategory: value }));
          setValidationErrors((prev) => ({
            ...prev,
            variableCategory: validateVariableCategory(value),
            name: form.name.trim() ? validateName(form.name) : "",
          }));
        }}
      >
        <SelectTrigger id="f2-item" className={validationErrors.variableCategory ? "border-red-500" : ""}>
          <SelectValue placeholder="Select item" />
        </SelectTrigger>
        <SelectContent>
          {variables.length === 0 ? (
            <div className="py-4 px-2 text-sm text-muted-foreground text-center">No items yet.</div>
          ) : (
            <>
              <SelectItem value={FORM2_STANDALONE_PACKAGE_CATEGORY}>{FORM2_STANDALONE_PACKAGE_CATEGORY}</SelectItem>
              {variables.map((v) => (
                <SelectItem key={v.id} value={String(v.id)}>
                  {v.name}
                  {v.category ? ` (${v.category})` : ""}
                </SelectItem>
              ))}
            </>
          )}
        </SelectContent>
      </Select>
      {validationErrors.variableCategory && (
        <p className="text-xs text-red-500">{validationErrors.variableCategory}</p>
      )}
    </div>
  );

  const renderForm2Details = () => (
    <>
      <p className="text-sm text-muted-foreground">
        Packages appear on the booking form when they match your dependency settings (frequency, service, and this
        package&apos;s Dependencies tab). They are not tied to items.
      </p>
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Label htmlFor="f2-name">Name</Label>
          <OrangeInfoTip text="Public name for this package (for example Basic package or Rug cleaning)." />
        </div>
        <Input
          id="f2-name"
          value={form.name}
          onChange={(e) => {
            const value = e.target.value;
            setForm((p) => ({ ...p, name: value }));
            setValidationErrors((prev) => ({ ...prev, name: validateName(value) }));
          }}
          onBlur={(e) => setValidationErrors((prev) => ({ ...prev, name: validateName(e.target.value) }))}
          placeholder="Ex: Bike Cleaning"
          className={validationErrors.name ? "border-red-500" : ""}
        />
        {validationErrors.name && <p className="text-xs text-red-500">{validationErrors.name}</p>}
      </div>

      <div className="flex items-center gap-2">
        <Checkbox
          id="different-on-customer-end-f2"
          checked={form.differentOnCustomerEnd}
          onCheckedChange={(v) => setForm((p) => ({ ...p, differentOnCustomerEnd: !!v }))}
        />
        <Label htmlFor="different-on-customer-end-f2" className="text-sm font-normal">
          Different on customer end
        </Label>
        <OrangeInfoTip text="When enabled, you can show a different label or copy to customers than staff see (configured elsewhere)." />
      </div>

      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Label>Description</Label>
          <OrangeInfoTip text="Rich text shown where this package is described (staff or customer views depend on Display)." />
        </div>
        <Form1RichTextEditor
          key={editId ? `${editId}-loaded-${editLoading ? "0" : "1"}` : "new-package"}
          value={form.description}
          onChange={(html) => setForm((p) => ({ ...p, description: html }))}
        />
      </div>

      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <Checkbox
            id="show-explanation-icon-f2"
            checked={form.showExplanationIcon}
            onCheckedChange={(v) => setForm((p) => ({ ...p, showExplanationIcon: !!v }))}
          />
          <Label htmlFor="show-explanation-icon-f2" className="text-sm font-normal">
            Show explanation icon on form
          </Label>
          <OrangeInfoTip text="Shows a help icon next to this package on the booking form so customers can read more." />
        </div>
        <div className="flex items-center gap-2">
          <Checkbox
            id="enable-popup-on-selection-f2"
            checked={form.enablePopupOnSelection}
            onCheckedChange={(v) => setForm((p) => ({ ...p, enablePopupOnSelection: !!v }))}
          />
          <Label htmlFor="enable-popup-on-selection-f2" className="text-sm font-normal">
            Enable popup on selection
          </Label>
          <OrangeInfoTip text="Opens a popup when this package is selected so you can show longer details." />
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Label>Display</Label>
          <OrangeInfoTip text="Choose whether this package appears on the public booking page, only when logged in, or for admin only." />
        </div>
        <p className="text-xs text-muted-foreground">
          Where should this package be visible—customer booking (logged in or out), backend, or admin only?
        </p>
        <RadioGroup
          value={form.display}
          onValueChange={(v: typeof form.display) => setForm((p) => ({ ...p, display: v }))}
          className="mt-2 grid gap-2"
        >
          <label className="flex cursor-pointer items-center gap-2 text-sm">
            <RadioGroupItem value="Customer Frontend, Backend & Admin" /> Customer frontend, backend & admin
          </label>
          <label className="flex cursor-pointer items-center gap-2 text-sm">
            <RadioGroupItem value="Customer Backend & Admin" /> Customer backend & admin
          </label>
          <label className="flex cursor-pointer items-center gap-2 text-sm">
            <RadioGroupItem value="Admin Only" /> Admin only
          </label>
        </RadioGroup>
      </div>

      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Label>Quantity based</Label>
          <OrangeInfoTip text="When Yes, this package is sold by quantity (for example packs of three). When No, one line item per booking." />
        </div>
        <RadioGroup
          value={form.quantityBased ? "yes" : "no"}
          onValueChange={(v) => setForm((p) => ({ ...p, quantityBased: v === "yes" }))}
          className="grid gap-2"
        >
          <label className="flex cursor-pointer items-center gap-2 text-sm">
            <RadioGroupItem value="yes" /> Yes
          </label>
          <label className="flex cursor-pointer items-center gap-2 text-sm">
            <RadioGroupItem value="no" /> No
          </label>
        </RadioGroup>
      </div>

      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Label className="text-base font-medium">Price &amp; Time</Label>
          <OrangeInfoTip text="S.A. is service area (at the customer’s location). M.L. is merchant location (at your store). You can set different price and duration for each." />
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-3 rounded-lg border bg-card p-4 shadow-sm">
            <p className="text-sm font-semibold tracking-wide text-muted-foreground">S.A</p>
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Pricing</Label>
              <div className="flex items-center gap-1">
                <span className="text-sm text-muted-foreground">$</span>
                <Input
                  type="number"
                  step="0.01"
                  min={0}
                  value={form.price}
                  onChange={(e) => {
                    const value = e.target.value;
                    setForm((p) => ({ ...p, price: value }));
                    setValidationErrors((prev) => ({ ...prev, price: validatePrice(value) }));
                  }}
                  onBlur={(e) => setValidationErrors((prev) => ({ ...prev, price: validatePrice(e.target.value) }))}
                  placeholder="0"
                  className={validationErrors.price ? "max-w-[140px] border-red-500" : "max-w-[140px]"}
                />
              </div>
              {validationErrors.price && <p className="text-xs text-red-500">{validationErrors.price}</p>}
            </div>
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Time</Label>
              <div className="grid max-w-xs grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Hours</Label>
                  <Select
                    value={form.hours === "" ? "0" : form.hours}
                    onValueChange={(v) => {
                      setForm((p) => ({ ...p, hours: v }));
                      setValidationErrors((prev) => ({
                        ...prev,
                        hours: validateHours(v, form.minutes),
                        minutes: validateMinutes(form.minutes, v),
                      }));
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Hours" />
                    </SelectTrigger>
                    <SelectContent className="max-h-48">
                      {FORM2_HOUR_OPTIONS.map((h) => (
                        <SelectItem key={h} value={h}>
                          {h}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Minutes</Label>
                  <Select
                    value={form.minutes === "" ? "0" : form.minutes}
                    onValueChange={(v) => {
                      setForm((p) => ({ ...p, minutes: v }));
                      setValidationErrors((prev) => ({
                        ...prev,
                        minutes: validateMinutes(v, form.hours),
                        hours: validateHours(form.hours, v),
                      }));
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Minutes" />
                    </SelectTrigger>
                    <SelectContent className="max-h-48">
                      {FORM2_MINUTE_OPTIONS.map((m) => (
                        <SelectItem key={m} value={m}>
                          {m}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-3 rounded-lg border bg-card p-4 shadow-sm">
            <p className="text-sm font-semibold tracking-wide text-muted-foreground">M.L</p>
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Pricing</Label>
              <div className="flex items-center gap-1">
                <span className="text-sm text-muted-foreground">$</span>
                <Input
                  type="number"
                  step="0.01"
                  min={0}
                  value={form.priceMerchant}
                  onChange={(e) => setForm((p) => ({ ...p, priceMerchant: e.target.value }))}
                  placeholder="0"
                  className="max-w-[140px]"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Time</Label>
              <div className="grid max-w-xs grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Hours</Label>
                  <Select
                    value={form.hoursMerchant === "" ? "0" : form.hoursMerchant}
                    onValueChange={(v) => setForm((p) => ({ ...p, hoursMerchant: v }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Hours" />
                    </SelectTrigger>
                    <SelectContent className="max-h-48">
                      {FORM2_HOUR_OPTIONS.map((h) => (
                        <SelectItem key={`ml-h-${h}`} value={h}>
                          {h}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Minutes</Label>
                  <Select
                    value={form.minutesMerchant === "" ? "0" : form.minutesMerchant}
                    onValueChange={(v) => setForm((p) => ({ ...p, minutesMerchant: v }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Minutes" />
                    </SelectTrigger>
                    <SelectContent className="max-h-48">
                      {FORM2_MINUTE_OPTIONS.map((m) => (
                        <SelectItem key={`ml-m-${m}`} value={m}>
                          {m}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Label>Select icon</Label>
          <OrangeInfoTip text="Presets use the same colored icons as the booking form. Upload a square image (recommended max 300×300 px) to use a custom graphic instead." />
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {form.packageIcon ? (
            <div className="flex flex-col items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-2 dark:border-slate-600 dark:bg-card">
              <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                Booking preview
              </span>
              <IndustryFormPresetIcon
                icon={form.packageIcon}
                framed={!industryFormIconIsImageSrc(form.packageIcon)}
              />
            </div>
          ) : null}
          <Button
            type="button"
            variant="outline"
            onClick={() => setShowIconDialog(true)}
            className="gap-2"
          >
            Select icon
          </Button>
          <Button
            type="button"
            variant="ghost"
            onClick={() => setForm((p) => ({ ...p, packageIcon: "" }))}
            disabled={!form.packageIcon}
          >
            Clear
          </Button>
          <span className="text-sm text-muted-foreground">Or upload</span>
          <div className="flex flex-wrap items-center gap-2">
            <Input
              type="file"
              accept="image/*"
              className="hidden"
              id="f2-package-icon-upload"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                if (!file.type.startsWith("image/")) return;
                const reader = new FileReader();
                reader.onload = () => {
                  const r = String(reader.result || "");
                  if (r.length > 400_000) {
                    toast({
                      title: "Image too large",
                      description: "Please use a smaller file (try under 300×300 px).",
                      variant: "destructive",
                    });
                    return;
                  }
                  setForm((p) => ({ ...p, packageIcon: r }));
                };
                reader.readAsDataURL(file);
              }}
            />
            <Button type="button" variant="default" className="bg-blue-600 hover:bg-blue-700" asChild>
              <label htmlFor="f2-package-icon-upload" className="cursor-pointer">
                Browse
              </label>
            </Button>
          </div>
        </div>
        <p className="text-xs text-muted-foreground">Image size should not be more than 300px by 300px.</p>
      </div>

      <Dialog open={showIconDialog} onOpenChange={setShowIconDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Select icon</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-6 gap-2 sm:grid-cols-8 md:grid-cols-10">
            {INDUSTRY_FORM_ICON_PRESETS.map(({ value, name, Icon }) => {
              const selected = form.packageIcon === value;
              return (
                <Button
                  key={value}
                  type="button"
                  variant="outline"
                  size="icon"
                  className={industryFormIconPickerButtonClass(selected)}
                  onClick={() => {
                    setForm((p) => ({ ...p, packageIcon: value }));
                    setShowIconDialog(false);
                  }}
                  aria-label={`Icon ${name}`}
                  title={name}
                  aria-pressed={selected}
                >
                  <Icon className={cn("h-5 w-5", bookingFormPresetIconTextClass(value))} />
                </Button>
              );
            })}
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setForm((p) => ({ ...p, packageIcon: "" }));
                setShowIconDialog(false);
              }}
            >
              Clear
            </Button>
            <Button type="button" variant="default" onClick={() => setShowIconDialog(false)}>
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="flex items-center gap-2">
        <Checkbox
          id="default-tier-f2"
          checked={form.isDefault}
          onCheckedChange={(v) => setForm((p) => ({ ...p, isDefault: !!v }))}
        />
        <Label htmlFor="default-tier-f2" className="text-sm font-normal">
          Set as default
        </Label>
      </div>
    </>
  );

  const save = async () => {
    if (!form.name.trim()) {
      toast({
        title: "Validation Error",
        description: isForm2 ? "Name is required." : "Name is required.",
        variant: "destructive",
      });
      return;
    }

    if (!isForm2 && !form.variableCategory.trim()) {
      toast({
        title: "Validation Error",
        description: "Variable category is required",
        variant: "destructive",
      });
      return;
    }

    if (!industryId) {
      toast({
        title: "Error",
        description: "Industry ID is missing",
        variant: "destructive",
      });
      return;
    }

    if (!currentBusiness?.id) {
      toast({
        title: "Error",
        description: "Business not found",
        variant: "destructive",
      });
      return;
    }

    const serviceCategoryValue = form.showBasedOnServiceCategory ? form.serviceCategory.join(", ") : "";
    const duplicate = findDuplicateParameterForName(form.name);

    if (duplicate) {
      const standalone = form.variableCategory === FORM2_STANDALONE_PACKAGE_CATEGORY;
      toast({
        title: isForm2 ? "Duplicate package" : "Duplicate Parameter",
        description:
          isForm2 && standalone
            ? `A package named "${form.name.trim()}" already exists. Choose a different name.`
            : isForm2
              ? `A package with the name "${form.name.trim()}" already exists for this item and service scope. Change the name or service category selection.`
              : `A parameter with the name "${form.name.trim()}" already exists for this variable category and service scope. Change the name or service category selection.`,
        variant: "destructive",
      });
      return;
    }

    setSaving(true);

    try {
      const price = Number(form.price) || 0;
      const hours = Number(form.hours) || 0;
      const minutes = Number(form.minutes) || 0;
      const timeMinutes = (hours * 60) + minutes;
      const mlHours = Number(form.hoursMerchant) || 0;
      const mlMinutes = Number(form.minutesMerchant) || 0;
      const timeMinutesMerchant = (mlHours * 60) + mlMinutes;
      const hasMlPrice = form.priceMerchant.trim() !== "";
      const hasMlTime = Boolean(form.hoursMerchant.trim() || form.minutesMerchant.trim());

      // Auto-set service category and frequency based on form state
      const serviceCategory2Value = form.showBasedOnServiceCategory2 ? form.serviceCategory2.join(", ") : "";
      const frequencyValue = form.showBasedOnFrequency ? form.frequency.join(", ") : "";

      console.log('=== SAVING PRICING PARAMETER DEBUG ===');
      console.log('showBasedOnFrequency:', form.showBasedOnFrequency);
      console.log('showBasedOnServiceCategory:', form.showBasedOnServiceCategory);
      console.log('form.frequency:', form.frequency);
      console.log('form.serviceCategory:', form.serviceCategory);
      console.log('frequencyValue:', frequencyValue);
      console.log('serviceCategoryValue:', serviceCategoryValue);
      console.log('form.excludeParameters:', form.excludeParameters);
      console.log('form.excludeParameters type:', typeof form.excludeParameters);
      console.log('form.excludeParameters array?:', Array.isArray(form.excludeParameters));

      const paramData: Record<string, unknown> = {
        business_id: currentBusiness.id,
        industry_id: industryId,
        booking_form_scope: bookingFormScope,
        name: form.name.trim(),
        description: form.description || undefined,
        variable_category: isForm2 ? FORM2_STANDALONE_PACKAGE_CATEGORY : form.variableCategory,
        price,
        time_minutes: timeMinutes,
        display: form.display,
        service_category: serviceCategoryValue || undefined,
        service_category2: serviceCategory2Value || undefined,
        frequency: frequencyValue || undefined,
        is_default: form.isDefault,
        show_based_on_frequency: form.showBasedOnFrequency,
        show_based_on_service_category: form.showBasedOnServiceCategory,
        show_based_on_service_category2: form.showBasedOnServiceCategory2,
        excluded_extras: form.excludedExtras.map(String),
        excluded_services: form.excludedServices.map(String),
        excluded_providers: form.excludedProviders,
        exclude_parameters: isForm2 ? [] : form.excludeParameters,
      };

      if (isForm2) {
        paramData.pricing_variable_id = null;
        paramData.price_merchant_location = hasMlPrice ? Number(form.priceMerchant) || 0 : null;
        paramData.time_minutes_merchant_location = hasMlTime ? timeMinutesMerchant : null;
        paramData.quantity_based = form.quantityBased;
        paramData.icon = form.packageIcon.trim() ? form.packageIcon.trim() : null;
      }
      if (isForm4) {
        paramData.quantity_based = true;
        paramData.unit_label = form.variableCategory.trim() || inferForm4PresetVariable(industry);
      }

      if (editId) {
        // Update existing
        const response = await fetch('/api/pricing-parameters', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: editId, ...paramData }),
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || 'Failed to update pricing parameter');
        }

        toast({
          title: "Success",
          description: "Pricing parameter updated successfully",
        });
      } else {
        // Create new
        const response = await fetch('/api/pricing-parameters', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(paramData),
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || 'Failed to create pricing parameter');
        }

        toast({
          title: "Success",
          description: "Pricing parameter created successfully",
        });
      }

      router.push(
        `${packagesBasePath}?industry=${encodeURIComponent(industry)}${scopeQs}`,
      );
    } catch (error: any) {
      console.error('Error saving pricing parameter:', error);
      toast({
        title: "Error",
        description: error.message || 'Failed to save pricing parameter',
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <TooltipProvider delayDuration={200}>
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>
            {isForm2
              ? editId
                ? "Edit package"
                : "Add package"
              : editId
                ? "Edit Pricing Parameter"
                : isForm4
                  ? "Add Form 2 Pricing Parameter"
                  : "Add Pricing Parameter"}
          </CardTitle>
          <CardDescription>
            {isForm2
              ? `Packages are offered on the booking form based on dependency settings (frequency, service, and per-package rules)—not by item (${industry}).`
              : `Configure pricing parameter for ${industry}.`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {editId && editLoading ? (
            <div className="flex items-center justify-center gap-2 py-16 text-sm text-muted-foreground" aria-busy="true">
              <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
              Loading package…
            </div>
          ) : null}
          <Tabs defaultValue="details" className={cn("w-full", editId && editLoading && "pointer-events-none opacity-50")}>
            <TabsList
              className={cn(
                "mb-6 w-full",
                isForm2
                  ? "grid h-auto grid-cols-3 gap-0 rounded-none border-b border-border bg-transparent p-0"
                  : "grid grid-cols-3",
              )}
            >
              <TabsTrigger
                value="details"
                className={cn(
                  isForm2 &&
                    "rounded-none border-b-2 border-transparent pb-2 data-[state=active]:border-orange-500 data-[state=active]:bg-transparent data-[state=active]:shadow-none",
                )}
              >
                Details
              </TabsTrigger>
              <TabsTrigger
                value="dependencies"
                className={cn(
                  isForm2 &&
                    "rounded-none border-b-2 border-transparent pb-2 data-[state=active]:border-orange-500 data-[state=active]:bg-transparent data-[state=active]:shadow-none",
                )}
              >
                Dependencies
              </TabsTrigger>
              <TabsTrigger
                value="providers"
                className={cn(
                  isForm2 &&
                    "rounded-none border-b-2 border-transparent pb-2 data-[state=active]:border-orange-500 data-[state=active]:bg-transparent data-[state=active]:shadow-none",
                )}
              >
                Providers
              </TabsTrigger>
            </TabsList>

            {/* DETAILS TAB */}
            <TabsContent value="details" className={cn("mt-4 space-y-6", isForm2 && "space-y-8")}>
              {isForm2 ? (
                renderForm2Details()
              ) : (
              <>
              <p className="text-sm text-muted-foreground">
                Every service has a variable attached to them and based on that variable a pricing structure begins.
                For example a cleaning service may use the variable called bedrooms and the first variable might be 1 Bedroom that starts at $90 and you can add on extras to this variable later.
                If you have 2 variables then Variable B might be bathrooms and for 1 bathroom the price might be $20 which now means that 1 bedroom and 1 bathroom would be $110.
              </p>

              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Label htmlFor="name">Name</Label>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent>Name of this pricing tier (e.g. 1 Bedroom, 2 Bedrooms)</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                <Input
                  id="name"
                  value={form.name}
                  onChange={(e) => {
                    const value = e.target.value;
                    setForm(p => ({ ...p, name: value }));
                    setValidationErrors(prev => ({ ...prev, name: validateName(value) }));
                  }}
                  onBlur={(e) => setValidationErrors(prev => ({ ...prev, name: validateName(e.target.value) }))}
                  placeholder="Enter Name"
                  className={validationErrors.name ? "border-red-500" : ""}
                />
                {validationErrors.name && <p className="text-xs text-red-500">{validationErrors.name}</p>}
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="different-on-customer-end"
                    checked={form.differentOnCustomerEnd}
                    onCheckedChange={(v) => setForm(p => ({ ...p, differentOnCustomerEnd: !!v }))}
                  />
                  <Label htmlFor="different-on-customer-end" className="text-sm font-normal">Different on customer end</Label>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Label htmlFor="description">Description</Label>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent>Optional description for this pricing parameter</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                <Textarea
                  id="description"
                  rows={3}
                  value={form.description}
                  onChange={(e) => setForm(p => ({ ...p, description: e.target.value }))}
                  placeholder="Add Description"
                />
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="show-explanation-icon"
                      checked={form.showExplanationIcon}
                      onCheckedChange={(v) => setForm(p => ({ ...p, showExplanationIcon: !!v }))}
                    />
                    <Label htmlFor="show-explanation-icon" className="text-sm font-normal">Show explanation icon on form</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="enable-popup-on-selection"
                      checked={form.enablePopupOnSelection}
                      onCheckedChange={(v) => setForm(p => ({ ...p, enablePopupOnSelection: !!v }))}
                    />
                    <Label htmlFor="enable-popup-on-selection" className="text-sm font-normal">Enable popup on selection</Label>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Display</Label>
                <p className="text-xs text-muted-foreground">
                  Where do you want this variable to show up? Do you want customers to be able to see it? Do you want them to see it when they are booking when logged out or only when they have an account and are logged in or do you want only admin/staff to see this variable when booking, meaning customers can&apos;t book for this variable and only you can.
                </p>
                <RadioGroup
                  value={form.display}
                  onValueChange={(v: typeof form.display) => setForm(p => ({ ...p, display: v }))}
                  className="grid gap-2 mt-2"
                >
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <RadioGroupItem value="Customer Frontend, Backend & Admin" /> Customer frontend, backend & admin
                  </label>
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <RadioGroupItem value="Customer Backend & Admin" /> Customer backend & admin
                  </label>
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <RadioGroupItem value="Admin Only" /> Admin only
                  </label>
                </RadioGroup>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Label htmlFor="variable-category">{isForm2 ? "Item" : "Variable category"}</Label>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent>
                        {isForm2
                          ? "Select which item this package belongs to (or pick Standalone)."
                          : "Select the variable category from the ones you added in Manage Variables"}
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                <div className="flex items-center gap-2">
                  <Select
                    value={form.variableCategory || undefined}
                    onValueChange={(value) => {
                      setForm(p => ({ ...p, variableCategory: value }));
                      setValidationErrors(prev => ({ ...prev, variableCategory: validateVariableCategory(value) }));
                    }}
                  >
                    <SelectTrigger id="variable-category" className={validationErrors.variableCategory ? "border-red-500" : ""}>
                      <SelectValue placeholder={isForm2 ? "Select item" : "Select variable category"} />
                    </SelectTrigger>
                    <SelectContent>
                      {(() => {
                        if (isForm2) {
                          if (variables.length === 0) {
                            return (
                              <div className="py-4 px-2 text-sm text-muted-foreground text-center">
                                No items yet. Add one below.
                              </div>
                            );
                          }
                          return (
                            <>
                              <SelectItem value={FORM2_STANDALONE_PACKAGE_CATEGORY}>
                                {FORM2_STANDALONE_PACKAGE_CATEGORY}
                              </SelectItem>
                              {variables.map((v) => (
                                <SelectItem key={v.id} value={String(v.id)}>
                                  {v.name}
                                </SelectItem>
                              ))}
                            </>
                          );
                        }
                        const hasCurrent = form.variableCategory && !variables.some((v) => v.category === form.variableCategory);
                        const options = hasCurrent
                          ? [
                              ...variables,
                              {
                                id: "_current",
                                name: form.variableCategory,
                                category: form.variableCategory,
                                isActive: true,
                                sortOrder: 0,
                              },
                            ]
                          : variables;
                        if (options.length === 0) {
                          return (
                            <div className="py-4 px-2 text-sm text-muted-foreground text-center">
                              No variables yet. Add one below.
                            </div>
                          );
                        }
                        return options.map((v) => (
                          <SelectItem key={v.id} value={v.category}>
                            {v.name}
                          </SelectItem>
                        ));
                      })()}
                    </SelectContent>
                  </Select>
                  <Button
                    type="button"
                    variant="link"
                    className="text-sm text-primary hover:underline whitespace-nowrap h-auto p-0"
                    onClick={() => setShowAddVariableDialog(true)}
                    disabled={!industryId}
                  >
                    Add Variable Category
                  </Button>
                </div>
                {validationErrors.variableCategory && (
                  <p className="text-xs text-red-500">{validationErrors.variableCategory}</p>
                )}
                {isForm4 && (
                  <p className="text-xs text-muted-foreground">
                    Preset default is selected from the industry. You can still change it.
                  </p>
                )}
              </div>

              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Label className="text-base font-medium">Price & Time</Label>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent>Pricing and estimated time for this parameter</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                <div className="grid gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="price" className="text-sm text-muted-foreground">Pricing</Label>
                    <div className="flex items-center gap-1">
                      <span className="text-sm text-muted-foreground">$</span>
                      <Input
                        id="price"
                        type="number"
                        step="0.01"
                        min="0"
                        value={form.price}
                        onChange={(e) => {
                          const value = e.target.value;
                          setForm(p => ({ ...p, price: value }));
                          setValidationErrors(prev => ({ ...prev, price: validatePrice(value) }));
                        }}
                        onBlur={(e) => setValidationErrors(prev => ({ ...prev, price: validatePrice(e.target.value) }))}
                        placeholder="0"
                        className={validationErrors.price ? "border-red-500 max-w-[140px]" : "max-w-[140px]"}
                      />
                    </div>
                    {validationErrors.price && <p className="text-xs text-red-500">{validationErrors.price}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm text-muted-foreground">Time</Label>
                    <div className="grid grid-cols-2 gap-4 max-w-xs">
                      <div className="space-y-1">
                        <Label htmlFor="hours" className="text-xs text-muted-foreground">Hours</Label>
                        <Input
                          id="hours"
                          type="number"
                          min={0}
                          value={form.hours}
                          onChange={(e) => {
                            const value = e.target.value;
                            setForm(p => ({ ...p, hours: value }));
                            setValidationErrors(prev => ({ ...prev, hours: validateHours(value, form.minutes), minutes: validateMinutes(form.minutes, value) }));
                          }}
                          onBlur={(e) => setValidationErrors(prev => ({ ...prev, hours: validateHours(e.target.value, form.minutes), minutes: validateMinutes(form.minutes, e.target.value) }))}
                          placeholder="0"
                          className={validationErrors.hours ? "border-red-500" : ""}
                        />
                        {validationErrors.hours && <p className="text-xs text-red-500">{validationErrors.hours}</p>}
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor="minutes" className="text-xs text-muted-foreground">Minutes</Label>
                        <Input
                          id="minutes"
                          type="number"
                          min={0}
                          max={59}
                          value={form.minutes}
                          onChange={(e) => {
                            const value = e.target.value;
                            setForm(p => ({ ...p, minutes: value }));
                            setValidationErrors(prev => ({ ...prev, minutes: validateMinutes(value, form.hours), hours: validateHours(form.hours, value) }));
                          }}
                          onBlur={(e) => setValidationErrors(prev => ({ ...prev, minutes: validateMinutes(e.target.value, form.hours), hours: validateHours(form.hours, e.target.value) }))}
                          placeholder="0"
                          className={validationErrors.minutes ? "border-red-500" : ""}
                        />
                        {validationErrors.minutes && <p className="text-xs text-red-500">{validationErrors.minutes}</p>}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Checkbox
                  id="default-tier"
                  checked={form.isDefault}
                  onCheckedChange={(v) => setForm(p => ({ ...p, isDefault: !!v }))}
                />
                <Label htmlFor="default-tier" className="text-sm font-normal">Set as Default</Label>
              </div>
              </>
              )}
            </TabsContent>

            {/* DEPENDENCIES TAB */}
            <TabsContent value="dependencies" className="mt-4 space-y-6">
              <div className="space-y-4">
                <div className="space-y-3">
                  <Label className="text-base font-semibold">
                    {isForm2
                      ? "Should the package show based on the frequency?"
                      : "Should the variables show based on the frequency?"}
                  </Label>
                  <RadioGroup
                    value={form.showBasedOnFrequency ? "yes" : "no"}
                    onValueChange={(v) => setForm(p => ({ ...p, showBasedOnFrequency: v === "yes" }))}
                    className="grid gap-2 pl-4"
                  >
                    <label className="flex items-center gap-2 text-sm">
                      <RadioGroupItem value="yes" /> Yes
                    </label>
                    <label className="flex items-center gap-2 text-sm">
                      <RadioGroupItem value="no" /> No
                    </label>
                  </RadioGroup>
                </div>

                {form.showBasedOnFrequency && (
                  <div className="space-y-2">
                    <Label htmlFor="frequency">Frequency</Label>
                    <div className="space-y-2 p-4 border rounded-lg bg-white">
                      <div className="flex items-center space-x-2 pb-2 border-b">
                        <Checkbox
                          id="select-all-frequencies"
                          checked={form.frequency.length === frequencies.length && frequencies.length > 0}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setForm(p => ({ ...p, frequency: frequencies.map(f => f.name) }));
                            } else {
                              setForm(p => ({ ...p, frequency: [] }));
                            }
                          }}
                        />
                        <label htmlFor="select-all-frequencies" className="text-sm font-medium cursor-pointer">
                          Select All
                        </label>
                      </div>
                      <div className="grid grid-cols-5 gap-2 max-h-48 overflow-y-auto">
                        {frequencies.map((frequency) => (
                          <div key={frequency.id} className="flex items-center space-x-2">
                            <Checkbox
                              id={`frequency-${frequency.id}`}
                              checked={form.frequency.includes(frequency.name)}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  setForm(p => ({ ...p, frequency: [...p.frequency, frequency.name] }));
                                } else {
                                  setForm(p => ({ ...p, frequency: p.frequency.filter(f => f !== frequency.name) }));
                                }
                              }}
                            />
                            <label htmlFor={`frequency-${frequency.id}`} className="text-sm cursor-pointer">
                              {frequency.name}
                            </label>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                <div className="space-y-3">
                  <Label className="text-base font-semibold">
                    {isForm2
                      ? "Should the package show based on the service category?"
                      : "Should the variables show based on the service category?"}
                  </Label>
                  <RadioGroup
                    value={form.showBasedOnServiceCategory ? "yes" : "no"}
                    onValueChange={(v) => setForm(p => ({ ...p, showBasedOnServiceCategory: v === "yes" }))}
                    className="grid gap-2 pl-4"
                  >
                    <label className="flex items-center gap-2 text-sm">
                      <RadioGroupItem value="yes" /> Yes
                    </label>
                    <label className="flex items-center gap-2 text-sm">
                      <RadioGroupItem value="no" /> No
                    </label>
                  </RadioGroup>
                </div>

                {form.showBasedOnServiceCategory && (
                  <div className="space-y-2">
                    <Label htmlFor="service-category">Service Category</Label>
                    <div className="space-y-2 p-4 border rounded-lg bg-white">
                      <div className="flex items-center space-x-2 pb-2 border-b">
                        <Checkbox
                          id="select-all-service-categories"
                          checked={form.serviceCategory.length === serviceCategories.length && serviceCategories.length > 0}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setForm(p => ({ ...p, serviceCategory: serviceCategories.map((c) => c.name) }));
                            } else {
                              setForm(p => ({ ...p, serviceCategory: [] }));
                            }
                          }}
                        />
                        <label htmlFor="select-all-service-categories" className="text-sm font-medium cursor-pointer">
                          Select All
                        </label>
                      </div>
                      <div className="grid grid-cols-5 gap-2 max-h-48 overflow-y-auto">
                        {serviceCategories.map((category) => (
                          <div key={category.id} className="flex items-center space-x-2">
                            <Checkbox
                              id={`service-category-${category.id}`}
                              checked={form.serviceCategory.includes(category.name)}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  setForm(p => ({ ...p, serviceCategory: [...p.serviceCategory, category.name] }));
                                } else {
                                  setForm(p => ({ ...p, serviceCategory: p.serviceCategory.filter(c => c !== category.name) }));
                                }
                              }}
                            />
                            <label htmlFor={`service-category-${category.id}`} className="text-sm cursor-pointer">
                              {category.name}
                            </label>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {isForm2 && (
                  <>
                    <div className="space-y-3">
                      <Label className="text-base font-semibold">Should the package show based on the item?</Label>
                      <RadioGroup
                        value={form.showBasedOnServiceCategory2 ? "yes" : "no"}
                        onValueChange={(v) => setForm((p) => ({ ...p, showBasedOnServiceCategory2: v === "yes" }))}
                        className="grid gap-2 pl-4"
                      >
                        <label className="flex items-center gap-2 text-sm">
                          <RadioGroupItem value="yes" /> Yes
                        </label>
                        <label className="flex items-center gap-2 text-sm">
                          <RadioGroupItem value="no" /> No
                        </label>
                      </RadioGroup>
                    </div>

                    {form.showBasedOnServiceCategory2 && (
                      <div className="space-y-2">
                        <Label>Items</Label>
                        <div className="space-y-2 p-4 border rounded-lg bg-white">
                          <div className="flex items-center space-x-2 pb-2 border-b">
                            <Checkbox
                              id="select-all-items"
                              checked={form.serviceCategory2.length === variables.length && variables.length > 0}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  setForm((p) => ({ ...p, serviceCategory2: variables.map((v) => v.name) }));
                                } else {
                                  setForm((p) => ({ ...p, serviceCategory2: [] }));
                                }
                              }}
                            />
                            <label htmlFor="select-all-items" className="text-sm font-medium cursor-pointer">
                              Select All
                            </label>
                          </div>
                          <div className="grid grid-cols-5 gap-2 max-h-48 overflow-y-auto">
                            {variables.map((item) => (
                              <div key={item.id} className="flex items-center space-x-2">
                                <Checkbox
                                  id={`item-${item.id}`}
                                  checked={form.serviceCategory2.includes(item.name)}
                                  onCheckedChange={(checked) => {
                                    if (checked) {
                                      setForm((p) => ({ ...p, serviceCategory2: [...p.serviceCategory2, item.name] }));
                                    } else {
                                      setForm((p) => ({
                                        ...p,
                                        serviceCategory2: p.serviceCategory2.filter((name) => name !== item.name),
                                      }));
                                    }
                                  }}
                                />
                                <label htmlFor={`item-${item.id}`} className="text-sm cursor-pointer">
                                  {item.name}
                                </label>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </>
                )}

                {isForm2 && (
                  <>
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Add-ons</Label>
                      {(() => {
                        const addonOptions = extras.filter((e) => (e.listing_kind ?? "extra") !== "extra");
                        return addonOptions.length === 0 ? (
                          <p className="text-sm text-muted-foreground pl-4">No add-ons available</p>
                        ) : (
                          <div className="space-y-2 p-4 border rounded-lg bg-white">
                            <div className="flex items-center space-x-2 pb-2 border-b">
                              <Checkbox
                                id="select-all-addons"
                                checked={addonOptions.length > 0 && addonOptions.every((e) => form.excludedExtras.includes(e.id))}
                                onCheckedChange={(checked) => {
                                  const addonIds = addonOptions.map((e) => e.id);
                                  if (checked) {
                                    setForm((p) => ({
                                      ...p,
                                      excludedExtras: Array.from(new Set([...p.excludedExtras, ...addonIds])),
                                    }));
                                  } else {
                                    const addonSet = new Set(addonIds);
                                    setForm((p) => ({
                                      ...p,
                                      excludedExtras: p.excludedExtras.filter((id) => !addonSet.has(id)),
                                    }));
                                  }
                                }}
                              />
                              <label htmlFor="select-all-addons" className="text-sm font-medium cursor-pointer">
                                Select All
                              </label>
                            </div>
                            <div className="grid grid-cols-5 gap-2 max-h-48 overflow-y-auto">
                              {addonOptions.map((addon) => (
                                <div key={addon.id} className="flex items-center space-x-2">
                                  <Checkbox
                                    id={`addon-${addon.id}`}
                                    checked={form.excludedExtras.includes(addon.id)}
                                    onCheckedChange={(checked) => {
                                      if (checked) {
                                        setForm((p) => ({ ...p, excludedExtras: [...p.excludedExtras, addon.id] }));
                                      } else {
                                        setForm((p) => ({
                                          ...p,
                                          excludedExtras: p.excludedExtras.filter((id) => id !== addon.id),
                                        }));
                                      }
                                    }}
                                  />
                                  <label htmlFor={`addon-${addon.id}`} className="text-sm cursor-pointer">
                                    {addon.name}
                                  </label>
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      })()}
                    </div>

                  </>
                )}

                

                {!isForm2 && !isForm4 && (
                <div className="space-y-3">
                  {/* Exclude Parameters Section */}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Exclude Parameters</Label>
                    {(() => {
                      // Filter exclude parameters based on frequency/service category settings
                      let filteredExcludeParams = excludeParameters;
                      
                      // If showBasedOnFrequency is Yes AND frequencies are selected, filter by those frequencies
                      // If showBasedOnServiceCategory is Yes AND service categories are selected, filter by those
                      // If both are No, show all exclude parameters (pricing parameter's own configuration)
                      
                      // Note: Currently we show all items regardless because exclude parameters don't have
                      // frequency/service category associations stored. When that data is available,
                      // implement filtering here based on form.showBasedOnFrequency and form.showBasedOnServiceCategory
                      
                      return filteredExcludeParams.length === 0 ? (
                        <p className="text-sm text-muted-foreground pl-4">No exclude parameters available</p>
                      ) : (
                        <div className="space-y-2 p-4 border rounded-lg bg-white">
                          <div className="flex items-center space-x-2 pb-2 border-b">
                            <Checkbox
                              id="select-all-exclude-parameters"
                              checked={form.excludeParameters.length === filteredExcludeParams.length && filteredExcludeParams.length > 0}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  setForm(p => ({ ...p, excludeParameters: filteredExcludeParams.map(ep => ep.id) }));
                                } else {
                                  setForm(p => ({ ...p, excludeParameters: [] }));
                                }
                              }}
                            />
                            <label htmlFor="select-all-exclude-parameters" className="text-sm font-medium cursor-pointer">
                              Select All
                            </label>
                          </div>
                          <div className="grid grid-cols-5 gap-2 max-h-48 overflow-y-auto">
                            {filteredExcludeParams.map((param) => (
                              <div key={param.id} className="flex items-center space-x-2">
                                <Checkbox
                                  id={`exclude-param-${param.id}`}
                                  checked={form.excludeParameters.includes(param.id)}
                                  onCheckedChange={(checked) => {
                                    if (checked) {
                                      setForm(p => ({ ...p, excludeParameters: [...p.excludeParameters, param.id] }));
                                    } else {
                                      setForm(p => ({ ...p, excludeParameters: p.excludeParameters.filter(id => id !== param.id) }));
                                    }
                                  }}
                                />
                                <label htmlFor={`exclude-param-${param.id}`} className="text-sm cursor-pointer">
                                  {param.name}
                                </label>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })()}
                  </div>

                  {/* Extras Section */}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Extras</Label>
                    {(() => {
                      // Filter extras based on frequency/service category settings
                      let filteredExtras = extras;
                      
                      // If showBasedOnFrequency is Yes AND frequencies are selected, filter by those frequencies
                      // If showBasedOnServiceCategory is Yes AND service categories are selected, filter by those
                      // If both are No, show all extras (pricing parameter's own configuration)
                      
                      // Note: Currently we show all items regardless because extras don't have
                      // frequency/service category associations stored. When that data is available,
                      // implement filtering here based on form.showBasedOnFrequency and form.showBasedOnServiceCategory
                      
                      return filteredExtras.length === 0 ? (
                        <p className="text-sm text-muted-foreground pl-4">No extras available</p>
                      ) : (
                        <div className="space-y-2 p-4 border rounded-lg bg-white">
                          <div className="flex items-center space-x-2 pb-2 border-b">
                            <Checkbox
                              id="select-all-extras"
                              checked={form.excludedExtras.length === filteredExtras.length && filteredExtras.length > 0}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  setForm(p => ({ ...p, excludedExtras: filteredExtras.map(e => e.id) }));
                                } else {
                                  setForm(p => ({ ...p, excludedExtras: [] }));
                                }
                              }}
                            />
                            <label htmlFor="select-all-extras" className="text-sm font-medium cursor-pointer">
                              Select All
                            </label>
                          </div>
                          <div className="grid grid-cols-5 gap-2 max-h-48 overflow-y-auto">
                            {filteredExtras.map((extra) => (
                              <div key={extra.id} className="flex items-center space-x-2">
                                <Checkbox
                                  id={`extra-${extra.id}`}
                                  checked={form.excludedExtras.includes(extra.id)}
                                  onCheckedChange={(checked) => {
                                    if (checked) {
                                      setForm(p => ({ ...p, excludedExtras: [...p.excludedExtras, extra.id] }));
                                    } else {
                                      setForm(p => ({ ...p, excludedExtras: p.excludedExtras.filter(id => id !== extra.id) }));
                                    }
                                  }}
                                />
                                <label htmlFor={`extra-${extra.id}`} className="text-sm cursor-pointer">
                                  {extra.name}
                                </label>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })()}
                  </div>

                </div>
                )}
              </div>
            </TabsContent>

            {/* PROVIDERS TAB */}
            <TabsContent value="providers" className="mt-4 space-y-6">
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Check the providers you want to exclude from this pricing parameter.
                </p>
                
                {providers.length === 0 ? (
                  <p className="text-sm text-muted-foreground italic">
                    No providers added yet. Add providers from the Providers section in the admin dashboard.
                  </p>
                ) : (
                  <div className="space-y-3">
                    <Label>Providers</Label>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Checkbox
                          id="select-all-providers"
                          checked={form.excludedProviders.length === providers.length && providers.length > 0}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setForm(p => ({ ...p, excludedProviders: providers.map(pr => pr.id) }));
                            } else {
                              setForm(p => ({ ...p, excludedProviders: [] }));
                            }
                          }}
                        />
                        <Label htmlFor="select-all-providers" className="text-sm font-medium cursor-pointer">Select All</Label>
                      </div>
                      {providers.map((provider) => (
                        <div key={provider.id} className="flex items-center gap-2">
                          <Checkbox
                            id={`provider-${provider.id}`}
                            checked={form.excludedProviders.includes(provider.id)}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setForm(p => ({ ...p, excludedProviders: [...p.excludedProviders, provider.id] }));
                              } else {
                                setForm(p => ({ ...p, excludedProviders: p.excludedProviders.filter(c => c !== provider.id) }));
                              }
                            }}
                          />
                          <Label htmlFor={`provider-${provider.id}`} className="text-sm font-normal cursor-pointer">{provider.name}</Label>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>

          <Dialog open={showAddVariableDialog} onOpenChange={setShowAddVariableDialog}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>{isForm2 ? "Add item" : "Add Variable Category"}</DialogTitle>
              </DialogHeader>
              <p className="text-sm text-muted-foreground">
                {isForm2
                  ? "Creates a new item and selects it for this package."
                  : "Add a new category here; it will be saved and selected for this pricing parameter."}
              </p>
              <div className="space-y-2">
                <Label htmlFor="new-variable-category">{isForm2 ? "Item name" : "Category name"}</Label>
                <Input
                  id="new-variable-category"
                  placeholder={isForm2 ? "e.g. Bedroom tier, Square footage" : "e.g. Bedrooms, Bathroom, Sq Ft"}
                  value={newVariableCategoryName}
                  onChange={(e) => setNewVariableCategoryName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addVariableCategoryInline()}
                />
              </div>
              <DialogFooter className="gap-2 sm:gap-0">
                <DialogClose asChild>
                  <Button variant="outline">Cancel</Button>
                </DialogClose>
                <Button onClick={addVariableCategoryInline} disabled={addingVariable}>
                  {addingVariable ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Add
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <div className="mt-6 flex gap-2 justify-end">
            <Button
              variant="outline"
              onClick={() =>
                router.push(
                  `${packagesBasePath}?industry=${encodeURIComponent(industry)}${scopeQs}`,
                )
              }
            >
              Cancel
            </Button>
            <Button
              onClick={save}
              disabled={
                saving ||
                (!isForm2 && !form.variableCategory) ||
                !form.name.trim() ||
                !form.price.trim() ||
                (!isForm2 && !form.hours.trim() && !form.minutes.trim()) ||
                (!isForm2 && !!validationErrors.variableCategory) ||
                !!validationErrors.name ||
                !!validationErrors.price ||
                (!isForm2 && !!validationErrors.hours) ||
                (!isForm2 && !!validationErrors.minutes)
              }
              className="text-white"
              style={{ background: "linear-gradient(135deg, #00BCD4 0%, #00D4E8 100%)" }}
            >
              {saving ? "Saving..." : (editId ? "Save" : "Create")}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
    </TooltipProvider>
  );
}
