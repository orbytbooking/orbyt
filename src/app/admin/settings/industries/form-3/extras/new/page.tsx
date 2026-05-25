"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ChevronDown, Info, Layers, Package, Sparkles, Upload, X } from "lucide-react";
import { INDUSTRY_FORM_ICON_PRESETS } from "@/lib/industryExtraIcons";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Form1RichTextEditor } from "@/components/admin/Form1RichTextEditor";
import {
  normalizeFrequencyPopupDisplay,
  type FrequencyPopupDisplay,
} from "@/lib/frequencyPopupDisplay";
import { useBusiness } from "@/contexts/BusinessContext";
import { toast } from "sonner";
import { useRef } from "react";
import {
  bookingFormScopeFromSearchParams,
  parseListingKindParam,
} from "@/lib/bookingFormScope";
import { Form3AddonDetailsFields } from "@/app/admin/settings/industries/form-3/extras/Form3AddonDetailsFields";
import { Form3ExtraDetailsFields } from "@/app/admin/settings/industries/form-3/extras/Form3ExtraDetailsFields";
import { Form3ExtraDependenciesFields } from "@/app/admin/settings/industries/form-3/extras/Form3ExtraDependenciesFields";
import { Form3AddonDependenciesFields } from "@/app/admin/settings/industries/form-3/extras/Form3AddonDependenciesFields";
import {
  form3ItemManualTierCount,
  parseForm3AddonItemPrices,
  primaryForm3AddonItemRow,
  reconcileForm3AddonItemPrices,
  serializeForm3AddonItemPrices,
  type Form3AddonItemPricesByItem,
  type Form3ItemCatalogMeta,
} from "@/lib/form3AddonItemPrices";

const FORM2_HOUR_OPTIONS = Array.from({ length: 24 }, (_, i) => String(i));
const FORM2_MINUTE_OPTIONS = Array.from({ length: 60 }, (_, i) => String(i));

function OrangeInfoTip({ text }: { text: string }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          className="inline-flex text-orange-500 hover:text-orange-600 focus:outline-none rounded-sm"
          aria-label="More info"
        >
          <Info className="h-4 w-4" />
        </button>
      </TooltipTrigger>
      <TooltipContent side="right" className="max-w-sm text-sm leading-snug">
        {text}
      </TooltipContent>
    </Tooltip>
  );
}

// Helper function to get display name for variables
const getVariableDisplayName = (param: any, category: string): string => {
  // If description exists and is not empty, use it
  if (param.description && param.description.trim()) {
    return param.description;
  }
  
  // If name looks like a descriptive name (not just numbers), use it
  if (param.name && !/^[\d\-\s]+$/.test(param.name)) {
    return param.name;
  }
  
  // Generate descriptive name based on category and value
  switch (category) {
    case 'Bathroom':
      return `${param.name} Bathroom${param.name !== '1' ? 's' : ''}`;
    case 'Sq Ft':
      return `${param.name} sq ft`;
    case 'Bedroom':
      return `${param.name} Bedroom${param.name !== '1' ? 's' : ''}`;
    default:
      return `${category}: ${param.name}`;
  }
};

type ExtraDisplay =
  | "frontend-backend-admin"
  | "backend-admin"
  | "admin-only"
  | "Both"
  | "Booking"
  | "Quote";

export default function ExtraNewPage() {
  const params = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const industry = params.get("industry") || "Industry";
  const industryId = params.get("industryId");
  const editId = params.get("editId");
  const bookingFormScope = bookingFormScopeFromSearchParams(params.get("bookingFormScope"), pathname);
  const listingKindFilter =
    parseListingKindParam(params.get("listingKind")) ??
    (pathname.includes("/add-ons") ? "addon" : "extra");
  const scopeQs =
    `&bookingFormScope=${bookingFormScope}` +
    (listingKindFilter ? `&listingKind=${listingKindFilter}` : "");
  const listing_kind = listingKindFilter === "addon" ? "addon" : "extra";
  const isForm2 = bookingFormScope === "form2";
  const isForm3 = bookingFormScope === "form3";
  const isSinglePageCatalog = isForm2 || isForm3;
  const isForm2Addon = isForm2 && listingKindFilter === "addon";
  const isForm3Addon = isForm3 && listingKindFilter === "addon";
  const isForm3Extra = isForm3 && listingKindFilter === "extra";
  const isSinglePageAddon = isForm2Addon || isForm3Addon;
  const hasForm3AddonWizard = isForm3Addon;
  const hasForm3ExtraWizard = isForm3Extra;
  const hasForm3Wizard = hasForm3AddonWizard || hasForm3ExtraWizard;
  const { currentBusiness } = useBusiness();
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState("details");
  
  const [form, setForm] = useState({
    name: "",
    description: "",
    differentOnCustomerEnd: false,
    customerEndName: "",
    showExplanationIconOnForm: false,
    explanationTooltipText: "",
    enablePopupOnSelection: false,
    popupContent: "",
    popupDisplay: "customer_frontend_backend_admin" as FrequencyPopupDisplay,
    icon: "",
    timeHours: "0",
    timeMinutes: "0",
    serviceCategory: "",
    price: "0",
    priceMerchant: "",
    hoursMerchant: "",
    minutesMerchant: "",
    display: "frontend-backend-admin" as ExtraDisplay,
    qtyBased: false,
    exemptFromDiscount: false,
    maximum: "",
    pricingStructure: "multiply" as "manual" | "multiply",
    manualPrices: [] as {
      price: string;
      timeHours: string;
      timeMinutes: string;
      priceMerchant: string;
      hoursMerchant: string;
      minutesMerchant: string;
    }[],
    applyToAllBookings: true as boolean,
    overrideTimePricing: false as boolean,
    exemptExtraTime: false as boolean,
    // Dependencies
    showBasedOnFrequency: false,
    frequencyOptions: [] as string[],
    showBasedOnLocation: false,
    locationOptions: [] as string[],
    showBasedOnServiceCategory: false,
    serviceCategoryOptions: [] as string[],
    showBasedOnVariables: false,
    variableOptions: [] as string[],
    itemPrices: {} as Form3AddonItemPricesByItem,
    // Providers
    excludedProviders: [] as string[],
  });

  const [providers, setProviders] = useState<Array<{ id: string; name: string }>>([]);
  
  // Icon functionality
  const [showIconPicker, setShowIconPicker] = useState(false);
  const [uploadedIcon, setUploadedIcon] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const predefinedIcons = INDUSTRY_FORM_ICON_PRESETS.map(({ name, value, Icon }) => ({
    name,
    value,
    icon: Icon,
  }));
  
  // Load available frequencies, service categories, and variables
  const [availableFrequencies, setAvailableFrequencies] = useState<string[]>([]);
  const [availableServiceCategories, setAvailableServiceCategories] = useState<string[]>([]);
  const [availableLocations, setAvailableLocations] = useState<string[]>([]);
  const [availableVariables, setAvailableVariables] = useState<{ [key: string]: any[] }>({});
  const [availablePackages, setAvailablePackages] = useState<string[]>([]);
  const [form3ItemCatalog, setForm3ItemCatalog] = useState<Record<string, Form3ItemCatalogMeta>>({});

  const form3ItemsNewHref = `/admin/settings/industries/form-3/items/new?industry=${encodeURIComponent(industry)}&industryId=${encodeURIComponent(industryId ?? "")}&bookingFormScope=form3`;

  useEffect(() => {
    if (isForm3Addon && !editId) {
      setForm((p) => ({
        ...p,
        qtyBased: true,
        pricingStructure: "multiply",
        icon: p.icon || "layers",
      }));
    }
    if (isForm3Extra && !editId) {
      setForm((p) => ({
        ...p,
        qtyBased: true,
        pricingStructure: "multiply",
        icon: p.icon || "layers",
      }));
    }
  }, [isForm3Addon, isForm3Extra, editId]);

  useEffect(() => {
    if (!isForm3Addon || Object.keys(form3ItemCatalog).length === 0) return;
    setForm((p) => {
      if (p.variableOptions.length === 0) return p;
      const manualMode = p.qtyBased && p.pricingStructure === "manual";
      return {
        ...p,
        itemPrices: reconcileForm3AddonItemPrices(p.variableOptions, p.itemPrices, {
          manualMode,
          itemCatalog: form3ItemCatalog,
        }),
      };
    });
  }, [form3ItemCatalog, isForm3Addon]);

  // Load providers from database
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

  // Load frequencies from database
  useEffect(() => {
    const fetchFrequencies = async () => {
      if (!industryId) return;
      
      try {
        const response = await fetch(
          `/api/industry-frequency?industryId=${industryId}&includeAll=true${scopeQs}`,
        );
        if (!response.ok) {
          throw new Error('Failed to fetch frequencies');
        }
        const data = await response.json();
        
        if (data.frequencies && Array.isArray(data.frequencies)) {
          const frequencyNames = data.frequencies
            .map((freq: any) => freq.name)
            .filter(Boolean);
          setAvailableFrequencies(frequencyNames);
        } else {
          setAvailableFrequencies([]);
        }
      } catch (error) {
        console.error('Error fetching frequencies:', error);
        setAvailableFrequencies([]);
      }
    };

    fetchFrequencies();
  }, [industryId, bookingFormScope, listingKindFilter]);

  // Load service categories from database
  useEffect(() => {
    const fetchServiceCategories = async () => {
      console.log('=== SERVICE CATEGORIES DEBUG ===');
      console.log('Industry ID:', industryId);
      console.log('Industry ID type:', typeof industryId);
      console.log('Industry ID value:', JSON.stringify(industryId));
      
      if (!industryId) {
        console.log('❌ No industryId available');
        return;
      }
      
      try {
        const apiUrl = `/api/service-categories?industryId=${industryId}${scopeQs}`;
        console.log('🔗 Fetching from:', apiUrl);
        
        const response = await fetch(apiUrl);
        console.log('📡 Response status:', response.status);
        console.log('📡 Response ok:', response.ok);
        
        if (!response.ok) {
          const errorText = await response.text();
          console.log('❌ Error response:', errorText);
          throw new Error('Failed to fetch service categories');
        }
        
        const data = await response.json();
        console.log('📦 Raw API response:', data);
        console.log('📦 data.serviceCategories:', data.serviceCategories);
        console.log('📦 Array.isArray(data.serviceCategories):', Array.isArray(data.serviceCategories));
        
        if (data.serviceCategories && Array.isArray(data.serviceCategories)) {
          console.log('✅ Found service categories array with', data.serviceCategories.length, 'items');
          data.serviceCategories.forEach((cat: any, index: number) => {
            console.log(`  ${index + 1}.`, cat);
          });
          
          const categoryNames = data.serviceCategories
            .map((cat: any) => cat.name)
            .filter(Boolean);
          console.log('📝 Extracted category names:', categoryNames);
          setAvailableServiceCategories(categoryNames);
        } else {
          console.log('❌ No service categories found or invalid format');
          setAvailableServiceCategories([]);
        }
      } catch (error) {
        console.error('💥 Error fetching service categories:', error);
        setAvailableServiceCategories([]);
      }
      console.log('=== END SERVICE CATEGORIES DEBUG ===');
    };

    fetchServiceCategories();
  }, [industryId, bookingFormScope, listingKindFilter]);

  useEffect(() => {
    const fetchLocations = async () => {
      if (!isForm3Extra || !currentBusiness?.id) {
        setAvailableLocations([]);
        return;
      }
      try {
        const response = await fetch(
          `/api/locations?business_id=${encodeURIComponent(currentBusiness.id)}`,
        );
        if (!response.ok) throw new Error("Failed to fetch locations");
        const data = await response.json();
        const names = (Array.isArray(data.locations) ? data.locations : [])
          .map((loc: { name?: string }) => String(loc.name ?? "").trim())
          .filter(Boolean);
        setAvailableLocations(Array.from(new Set(names)));
      } catch (error) {
        console.error("Error fetching locations for Form 3 extras:", error);
        setAvailableLocations([]);
      }
    };

    fetchLocations();
  }, [isForm3Extra, currentBusiness?.id]);

  // Load variables from database
  useEffect(() => {
    const fetchVariables = async () => {
      if (!industryId || !currentBusiness?.id) return;

      if (bookingFormScope === "form3") {
        try {
          const vRes = await fetch(
            `/api/pricing-variables?industryId=${encodeURIComponent(industryId)}&businessId=${encodeURIComponent(currentBusiness.id)}${scopeQs}`,
          );
          if (!vRes.ok) throw new Error("Failed to fetch pricing variables");
          const vData = await vRes.json();
          const vs = vData.variables ?? [];
          const catalog: Record<string, Form3ItemCatalogMeta> = {};
          const itemNames = vs
            .map((v: {
              name?: string;
              customer_end_name?: string | null;
              qty_based?: boolean;
              maximum_quantity?: number | null;
            }) => {
              const displayName = String(
                (v.customer_end_name && String(v.customer_end_name).trim()) || v.name || "",
              ).trim();
              if (displayName.length > 0) {
                catalog[displayName] = {
                  qtyBased: Boolean(v.qty_based),
                  maximumQuantity:
                    v.maximum_quantity != null && !Number.isNaN(Number(v.maximum_quantity))
                      ? Number(v.maximum_quantity)
                      : 0,
                };
              }
              return displayName;
            })
            .filter((name: string) => name.length > 0);
          setForm3ItemCatalog(catalog);
          setAvailablePackages(Array.from(new Set(itemNames)));
          setAvailableVariables({});
        } catch (error) {
          console.error("Error fetching Form 3 items for add-ons:", error);
          setAvailableVariables({});
          setForm3ItemCatalog({});
          setAvailablePackages([]);
        }
        return;
      }

      try {
        const response = await fetch(
          `/api/pricing-parameters?industryId=${encodeURIComponent(industryId)}&businessId=${encodeURIComponent(currentBusiness.id)}${scopeQs}`,
        );
        if (!response.ok) {
          throw new Error('Failed to fetch pricing parameters');
        }
        const data = await response.json();
        
        if (data.pricingParameters && Array.isArray(data.pricingParameters)) {
          if (bookingFormScope === "form2") {
            const packageNames = data.pricingParameters
              .map((param: any) => String(param.name ?? "").trim())
              .filter((name): name is string => name.length > 0);
            const uniquePackageNames: string[] = Array.from(new Set(packageNames));
            setAvailablePackages(uniquePackageNames);
            setAvailableVariables({});
            return;
          }
          // Group variables by category
          const groupedVariables: { [key: string]: any[] } = {};
          
          data.pricingParameters.forEach((param: any) => {
            const category = param.variable_category;
            if (!groupedVariables[category]) {
              groupedVariables[category] = [];
            }
            groupedVariables[category].push({
              id: param.id,
              name: param.name,
              description: param.description
            });
          });
          
          setAvailableVariables(groupedVariables);
          setAvailablePackages([]);
        } else {
          setAvailableVariables({});
          setAvailablePackages([]);
        }
      } catch (error) {
        console.error('Error fetching variables:', error);
        setAvailableVariables({});
        setAvailablePackages([]);
      }
    };

    fetchVariables();
  }, [industryId, currentBusiness?.id, bookingFormScope, listingKindFilter]);

  useEffect(() => {
    if (!industryId || !currentBusiness?.id) return;
    if (editId && editId !== 'undefined' && editId !== 'null') {
      // Validate UUID format before fetching
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      if (uuidRegex.test(editId)) {
        fetchExtraForEdit();
      } else {
        console.error('Invalid editId format in useEffect:', editId);
        toast.error('Invalid extra ID format');
      }
    }
  }, [editId, industryId, currentBusiness?.id]);

  const fetchExtraForEdit = async () => {
    console.log('=== FRONTEND DEBUG ===');
    console.log('editId:', editId);
    console.log('editId type:', typeof editId);
    console.log('editId length:', editId?.length);
    
    if (!editId || editId === 'undefined' || editId === 'null') {
      console.error('❌ Invalid editId:', editId);
      return;
    }
    if (!industryId || !currentBusiness?.id) {
      // Query requirements for GET /api/extras/[id]
      return;
    }

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(editId)) {
      console.error('❌ Invalid editId format:', editId);
      toast.error('Invalid extra ID format');
      return;
    }

    console.log('✅ Frontend validation passed, making API call...');
    
    try {
      const apiUrl = `/api/extras/${editId}?industryId=${encodeURIComponent(industryId)}&businessId=${encodeURIComponent(currentBusiness.id)}`;
      console.log('🔗 Calling API:', apiUrl);
      
      const response = await fetch(apiUrl);
      console.log('📡 Response status:', response.status);
      console.log('📡 Response ok:', response.ok);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.error || 'Failed to fetch extra';
        console.log('❌ API Error:', errorMessage);
        
        if (response.status === 404) {
          toast.error('Extra not found');
        } else if (response.status === 400) {
          toast.error(errorMessage);
        } else {
          toast.error(errorMessage);
        }
        throw new Error(errorMessage);
      }

      const { extra } = await response.json();
      console.log('✅ API Success, extra data:', extra);
      
      if (extra) {
        const hours = Math.floor((extra.time_minutes ?? 0) / 60);
        const minutes = (extra.time_minutes ?? 0) % 60;
        const ex = extra as Record<string, unknown>;
        const mlTmRaw = ex.time_minutes_merchant_location;
        const mlTm = mlTmRaw != null ? Number(mlTmRaw) : null;
        const mlHours = mlTm != null ? Math.floor(mlTm / 60) : 0;
        const mlMinutes = mlTm != null ? mlTm % 60 : 0;
        const structure =
          extra.pricing_structure === "manual" ? "manual" : "multiply";
        const manualPricesFromDb = (
          Array.isArray(extra.manual_prices) ? extra.manual_prices : []
        ).map((t: { price?: number; time_minutes?: number }) => {
          const tm = Number(t?.time_minutes) || 0;
          return {
            price: String(t?.price ?? ""),
            timeHours: String(Math.floor(tm / 60)),
            timeMinutes: String(tm % 60),
            priceMerchant: "",
            hoursMerchant: "",
            minutesMerchant: "",
          };
        });
        setForm({
          name: extra.name,
          description: extra.description || "",
          differentOnCustomerEnd: Boolean(extra.different_on_customer_end),
          customerEndName: String(extra.customer_end_name ?? "").trim(),
          showExplanationIconOnForm: Boolean(extra.show_explanation_icon_on_form),
          explanationTooltipText: String(extra.explanation_tooltip_text ?? ""),
          enablePopupOnSelection: Boolean(extra.enable_popup_on_selection),
          popupContent: String(extra.popup_content ?? ""),
          popupDisplay: normalizeFrequencyPopupDisplay(extra.popup_display),
          icon: extra.icon || "",
          timeHours: String(hours),
          timeMinutes: String(minutes),
          serviceCategory: extra.service_category || "",
          price: String(extra.price ?? 0),
          priceMerchant:
            ex.price_merchant_location != null ? String(ex.price_merchant_location) : "",
          hoursMerchant: mlTm != null ? String(mlHours) : "",
          minutesMerchant: mlTm != null ? String(mlMinutes) : "",
          display: extra.display,
          qtyBased: extra.qty_based,
          exemptFromDiscount: extra.exempt_from_discount ?? false,
          maximum: String(extra.maximum_quantity || ""),
          pricingStructure: structure,
          manualPrices: manualPricesFromDb,
          applyToAllBookings:
            extra.apply_to_all_bookings !== undefined ? Boolean(extra.apply_to_all_bookings) : true,
          overrideTimePricing: false,
          exemptExtraTime: false,
          showBasedOnFrequency: extra.show_based_on_frequency || false,
          frequencyOptions: extra.frequency_options || [],
          showBasedOnLocation: Boolean((ex as { show_based_on_location?: boolean }).show_based_on_location),
          locationOptions: Array.isArray((ex as { location_options?: string[] }).location_options)
            ? [...((ex as { location_options?: string[] }).location_options as string[])]
            : [],
          showBasedOnServiceCategory: extra.show_based_on_service_category || false,
          serviceCategoryOptions: extra.service_category_options || [],
          showBasedOnVariables: extra.show_based_on_variables || false,
          variableOptions: extra.variable_options || [],
          itemPrices: parseForm3AddonItemPrices(
            (ex as { item_prices?: unknown }).item_prices,
            extra.variable_options || [],
            {
              price: String(extra.price ?? 0),
              priceMerchant:
                ex.price_merchant_location != null ? String(ex.price_merchant_location) : "",
              timeHours: String(hours),
              timeMinutes: String(minutes),
              hoursMerchant: mlTm != null ? String(mlHours) : "",
              minutesMerchant: mlTm != null ? String(mlMinutes) : "",
            },
            {
              manualMode: structure === "manual",
              itemCatalog: form3ItemCatalog,
            },
          ),
          excludedProviders: extra.excluded_providers || [],
        });
        
        if (extra.icon && extra.icon.startsWith('data:')) {
          setUploadedIcon(extra.icon);
        }
        console.log('✅ Form populated successfully');
      }
    } catch (error) {
      console.error('💥 Frontend Error fetching extra:', error);
      // Don't show duplicate toast error if we already showed one above
      if (!(error instanceof Error && error.message.includes('Failed to fetch extra'))) {
        toast.error('Failed to load extra for editing');
      }
    }
    console.log('=== END FRONTEND DEBUG ===');
  };

  const save = async () => {
    if (!form.name.trim()) {
      toast.error('Please enter a name for the extra');
      return;
    }

    if (!industryId) {
      toast.error('Industry ID is missing');
      return;
    }

    if (!currentBusiness?.id) {
      toast.error('Business not found. Please try again.');
      return;
    }

    const legacyRow = {
      price: form.price,
      priceMerchant: form.priceMerchant,
      timeHours: form.timeHours,
      timeMinutes: form.timeMinutes,
      hoursMerchant: form.hoursMerchant,
      minutesMerchant: form.minutesMerchant,
    };
    const primaryRow =
      isForm3Addon && form.variableOptions.length > 0
        ? primaryForm3AddonItemRow(form.itemPrices, form.variableOptions, legacyRow)
        : legacyRow;
    const hours = Number(primaryRow.timeHours) || 0;
    const minutes = Number(primaryRow.timeMinutes) || 0;
    let time_minutes = hours * 60 + minutes;
    let price = Number(primaryRow.price) || 0;

    const maxParsed = form.maximum ? parseInt(form.maximum, 10) : NaN;
    const pricing_structure: "multiply" | "manual" = form.qtyBased
      ? form.pricingStructure === "manual"
        ? "manual"
        : "multiply"
      : "multiply";

    const form3ManualWithItems =
      isForm3Addon && pricing_structure === "manual" && form.variableOptions.length > 0;

    let maximum_quantity: number | undefined =
      form.qtyBased && !Number.isNaN(maxParsed) && maxParsed > 0 ? maxParsed : undefined;

    if (form3ManualWithItems) {
      const tierMax = Math.max(
        ...form.variableOptions.map((name) => form3ItemManualTierCount(form3ItemCatalog[name])),
        1,
      );
      maximum_quantity = tierMax;
    }

    let manual_prices: Array<{ price: number; time_minutes: number }> = [];
    if (
      form.qtyBased &&
      pricing_structure === "manual" &&
      maximum_quantity != null &&
      !form3ManualWithItems
    ) {
      manual_prices = Array.from({ length: maximum_quantity }, (_, i) => {
        const row = form.manualPrices[i];
        const th = Number(row?.timeHours) || 0;
        const tm = Number(row?.timeMinutes) || 0;
        return {
          price: Number(row?.price) || 0,
          time_minutes: th * 60 + tm,
        };
      });
      if (manual_prices.length > 0) {
        time_minutes = manual_prices[0].time_minutes;
        price = manual_prices[0].price;
      }
    }

    const mlHours = Number(primaryRow.hoursMerchant) || 0;
    const mlMinutes = Number(primaryRow.minutesMerchant) || 0;
    const timeMinutesMerchant = mlHours * 60 + mlMinutes;
    const hasMlPrice = primaryRow.priceMerchant.trim() !== "";
    const hasMlTime = Boolean(primaryRow.hoursMerchant.trim() || primaryRow.minutesMerchant.trim());

    const extraData: Record<string, unknown> = {
      business_id: currentBusiness.id,
      industry_id: industryId,
      name: form.name.trim(),
      description: form.description.trim() ? form.description.trim() : null,
      different_on_customer_end: form.differentOnCustomerEnd,
      customer_end_name:
        form.differentOnCustomerEnd && form.customerEndName.trim()
          ? form.customerEndName.trim()
          : null,
      show_explanation_icon_on_form: form.showExplanationIconOnForm,
      explanation_tooltip_text:
        form.showExplanationIconOnForm && form.explanationTooltipText.trim()
          ? form.explanationTooltipText.trim()
          : null,
      enable_popup_on_selection: form.enablePopupOnSelection,
      popup_content: form.enablePopupOnSelection ? form.popupContent : "",
      popup_display: form.enablePopupOnSelection
        ? form.popupDisplay
        : "customer_frontend_backend_admin",
      apply_to_all_bookings: form.applyToAllBookings,
      icon: form.icon || uploadedIcon || null,
      time_minutes,
      service_category: form.serviceCategory?.trim() ? form.serviceCategory.trim() : null,
      price,
      display: form.display,
      qty_based: form.qtyBased,
      maximum_quantity:
        form.qtyBased && maximum_quantity != null ? maximum_quantity : null,
      pricing_structure,
      manual_prices,
      exempt_from_discount: form.exemptFromDiscount,
      show_based_on_frequency: form.showBasedOnFrequency,
      frequency_options: form.showBasedOnFrequency ? form.frequencyOptions : [],
      ...(isForm3Extra
        ? {
            show_based_on_location: form.showBasedOnLocation,
            location_options: form.showBasedOnLocation ? form.locationOptions : [],
            show_based_on_service_category: form.showBasedOnServiceCategory,
            service_category_options: form.showBasedOnServiceCategory
              ? form.serviceCategoryOptions
              : [],
            show_based_on_variables: form.showBasedOnVariables,
            variable_options: form.showBasedOnVariables ? form.variableOptions : [],
          }
        : {
            show_based_on_service_category: form.showBasedOnServiceCategory,
            service_category_options: form.showBasedOnServiceCategory
              ? form.serviceCategoryOptions
              : [],
            show_based_on_variables: form.showBasedOnVariables,
            variable_options: form.showBasedOnVariables ? form.variableOptions : [],
          }),
      excluded_providers: form.excludedProviders,
      booking_form_scope: bookingFormScope,
      listing_kind,
    };

    if (isForm2Addon || isForm3Addon || isForm3Extra) {
      extraData.price_merchant_location = hasMlPrice ? Number(primaryRow.priceMerchant) : null;
      extraData.time_minutes_merchant_location = hasMlTime ? timeMinutesMerchant : null;
    }

    if (isForm3Addon && form.variableOptions.length > 0) {
      extraData.item_prices = serializeForm3AddonItemPrices(
        form.itemPrices,
        form.variableOptions,
        pricing_structure === "manual",
      );
      extraData.show_based_on_variables = true;
      extraData.variable_options = form.variableOptions;
    }

    try {
      setSaving(true);

      if (editId) {
        // Update existing extra
        const response = await fetch('/api/extras', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: editId, ...extraData }),
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || 'Failed to update extra');
        }

        toast.success(isSinglePageAddon ? 'Add-on updated successfully' : 'Extra updated successfully');
      } else {
        // Create new extra
        const response = await fetch('/api/extras', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(extraData),
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || 'Failed to create extra');
        }

        toast.success(isSinglePageAddon ? 'Add-on created successfully' : 'Extra created successfully');
      }

      router.push(
        `/admin/settings/industries/form-3/extras?industry=${encodeURIComponent(industry)}&industryId=${industryId}${scopeQs}`,
      );
    } catch (error) {
      console.error('Error saving extra:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to save extra');
    } finally {
      setSaving(false);
    }
  };

  const goBackTab = () => {
    if (activeTab === "providers") setActiveTab("dependencies");
    else if (activeTab === "dependencies") setActiveTab("details");
  };

  const goNextOrSave = async () => {
    if (!hasForm3Wizard) {
      await save();
      return;
    }
    if (activeTab === "details") {
      if (!form.name.trim()) {
        toast.error(
          isForm3Addon ? "Please enter a name for the add-on" : "Please enter a name for the extra",
        );
        return;
      }
      setActiveTab("dependencies");
      return;
    }
    if (hasForm3ExtraWizard && activeTab === "dependencies") {
      setActiveTab("providers");
      return;
    }
    await save();
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>
            {isForm3Addon
              ? editId
                ? "Edit add-on"
                : "Add add-ons"
              : isForm3Extra
                ? editId
                  ? "Edit extras"
                  : "Add extras"
                : editId
                  ? "Edit Extra"
                  : "Add Extra"}
          </CardTitle>
          <CardDescription>
            {isForm3Addon
              ? `If you want to allow customers to customize their purchases you can create add-ons that can make their requests very specific. For example if you offer car washing services, you can make add-ons such as "interior", "exterior", "waxing", "tire shine", etc., and they will be able to add those to their booking. Configure these for ${industry}.`
              : `Extras can be attached to a service and a variable (things like inside fridge for a cleaning services or wax for a car wash).`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs
            value={hasForm3Wizard ? activeTab : undefined}
            defaultValue={hasForm3Wizard ? undefined : "details"}
            onValueChange={hasForm3Wizard ? setActiveTab : undefined}
            className="w-full"
          >
            <TabsList
              className={cn(
                "mb-6 w-full",
                isSinglePageAddon
                  ? "grid h-auto grid-cols-2 gap-0 rounded-none border-b border-border bg-transparent p-0"
                  : "grid grid-cols-3",
              )}
            >
              <TabsTrigger
                value="details"
                className={cn(
                  isSinglePageAddon &&
                    "rounded-none border-b-2 border-transparent pb-2 data-[state=active]:border-orange-500 data-[state=active]:bg-transparent data-[state=active]:shadow-none",
                )}
              >
                Details
              </TabsTrigger>
              <TabsTrigger
                value="dependencies"
                className={cn(
                  isSinglePageAddon &&
                    "rounded-none border-b-2 border-transparent pb-2 data-[state=active]:border-orange-500 data-[state=active]:bg-transparent data-[state=active]:shadow-none",
                )}
              >
                Dependencies
              </TabsTrigger>
            {hasForm3ExtraWizard ? (
              <TabsTrigger value="providers">Providers</TabsTrigger>
            ) : !isSinglePageAddon ? (
              <TabsTrigger value="providers">Providers</TabsTrigger>
            ) : null}
            </TabsList>

            {/* DETAILS TAB */}
            <TabsContent value="details" className={cn("mt-4 space-y-5", (isSinglePageAddon || hasForm3ExtraWizard) && "space-y-8")}>
              {isForm3Addon ? (
                <Form3AddonDetailsFields
                  form={{
                    name: form.name,
                    description: form.description,
                    differentOnCustomerEnd: form.differentOnCustomerEnd,
                    customerEndName: form.customerEndName,
                    showExplanationIconOnForm: form.showExplanationIconOnForm,
                    explanationTooltipText: form.explanationTooltipText,
                    enablePopupOnSelection: form.enablePopupOnSelection,
                    display: form.display,
                    qtyBased: form.qtyBased,
                    pricingStructure: form.pricingStructure,
                    maximum: form.maximum,
                    selectedItems: form.variableOptions,
                    itemPrices: form.itemPrices,
                    icon: form.icon,
                  }}
                  onChange={(patch) =>
                    setForm((p) => {
                      const pricingStructure = patch.pricingStructure ?? p.pricingStructure;
                      const qtyBased = patch.qtyBased ?? p.qtyBased;
                      const manualMode = qtyBased && pricingStructure === "manual";
                      const next = { ...p, ...patch };
                      if (patch.selectedItems !== undefined) {
                        next.variableOptions = patch.selectedItems;
                        next.showBasedOnVariables = patch.selectedItems.length > 0;
                        next.itemPrices = reconcileForm3AddonItemPrices(
                          patch.selectedItems,
                          patch.itemPrices ?? p.itemPrices,
                          { manualMode, itemCatalog: form3ItemCatalog },
                        );
                      } else if (
                        patch.pricingStructure !== undefined ||
                        patch.qtyBased !== undefined
                      ) {
                        next.itemPrices = reconcileForm3AddonItemPrices(
                          next.variableOptions,
                          next.itemPrices,
                          { manualMode, itemCatalog: form3ItemCatalog },
                        );
                      }
                      if (patch.itemPrices !== undefined) {
                        next.itemPrices = patch.itemPrices;
                      }
                      return next;
                    })
                  }
                  availableItemNames={availablePackages}
                  itemCatalog={form3ItemCatalog}
                  itemsNewHref={form3ItemsNewHref}
                  selectedIconId={form.icon || "layers"}
                  onSelectIcon={(id) => {
                    setForm((p) => ({ ...p, icon: id }));
                    setUploadedIcon(null);
                  }}
                />
              ) : (
                <Form3ExtraDetailsFields
                  form={{
                    name: form.name,
                    description: form.description,
                    differentOnCustomerEnd: form.differentOnCustomerEnd,
                    customerEndName: form.customerEndName,
                    showExplanationIconOnForm: form.showExplanationIconOnForm,
                    explanationTooltipText: form.explanationTooltipText,
                    enablePopupOnSelection: form.enablePopupOnSelection,
                    popupContent: form.popupContent,
                    popupDisplay: form.popupDisplay,
                    display: form.display,
                    overrideTimePricing: form.overrideTimePricing,
                    exemptExtraTime: form.exemptExtraTime,
                    exemptFromDiscount: form.exemptFromDiscount,
                    qtyBased: form.qtyBased,
                    maximum: form.maximum,
                    pricingStructure: form.pricingStructure,
                    manualPrices: form.manualPrices,
                    price: form.price,
                    priceMerchant: form.priceMerchant,
                    timeHours: form.timeHours,
                    timeMinutes: form.timeMinutes,
                    hoursMerchant: form.hoursMerchant,
                    minutesMerchant: form.minutesMerchant,
                    applyToAllBookings: form.applyToAllBookings,
                    icon: form.icon,
                  }}
                  onChange={(patch) => setForm((p) => ({ ...p, ...patch }))}
                  uploadedIcon={uploadedIcon}
                  onUploadedIconChange={setUploadedIcon}
                  showIconPicker={showIconPicker}
                  onShowIconPickerChange={setShowIconPicker}
                  onBrowseUpload={() => fileInputRef.current?.click()}
                  fileInputRef={fileInputRef}
                  onFileSelected={(file) => {
                    const reader = new FileReader();
                    reader.onloadend = () => {
                      setUploadedIcon(reader.result as string);
                      setForm((p) => ({ ...p, icon: "" }));
                      toast.success("Icon uploaded successfully");
                    };
                    reader.readAsDataURL(file);
                  }}
                />
              )}
            </TabsContent>

            {/* DEPENDENCIES TAB */}
            <TabsContent value="dependencies" className="mt-4 space-y-6">
              {isForm3Addon ? (
                <Form3AddonDependenciesFields
                  form={{
                    showBasedOnFrequency: form.showBasedOnFrequency,
                    frequencyOptions: form.frequencyOptions,
                    showBasedOnServiceCategory: form.showBasedOnServiceCategory,
                    serviceCategoryOptions: form.serviceCategoryOptions,
                    showBasedOnVariables: form.showBasedOnVariables,
                    variableOptions: form.variableOptions,
                  }}
                  onChange={(patch) => setForm((p) => ({ ...p, ...patch }))}
                  frequencyNames={availableFrequencies}
                  serviceCategoryNames={availableServiceCategories}
                  itemNames={availablePackages}
                />
              ) : isForm3Extra ? (
                <Form3ExtraDependenciesFields
                  form={{
                    showBasedOnFrequency: form.showBasedOnFrequency,
                    frequencyOptions: form.frequencyOptions,
                    showBasedOnLocation: form.showBasedOnLocation,
                    locationOptions: form.locationOptions,
                    showBasedOnServiceCategory: form.showBasedOnServiceCategory,
                    serviceCategoryOptions: form.serviceCategoryOptions,
                    showBasedOnItems: form.showBasedOnVariables,
                    itemOptions: form.variableOptions,
                  }}
                  onChange={(patch) =>
                    setForm((p) => ({
                      ...p,
                      ...patch,
                      ...(patch.showBasedOnItems !== undefined
                        ? { showBasedOnVariables: patch.showBasedOnItems }
                        : {}),
                      ...(patch.itemOptions !== undefined
                        ? { variableOptions: patch.itemOptions }
                        : {}),
                    }))
                  }
                  frequencyNames={availableFrequencies}
                  locationNames={availableLocations}
                  serviceCategoryNames={availableServiceCategories}
                  itemNames={availablePackages}
                />
              ) : null}

            </TabsContent>

            {/* PROVIDERS TAB */}
            {!isSinglePageAddon ? (
            <TabsContent value="providers" className="mt-4 space-y-6">
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Check the providers you want to exclude from this extra.
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
            ) : null}
          </Tabs>
          
          <div className="mt-6 flex gap-2 justify-end">
            <Button
              variant="outline"
              onClick={() =>
                router.push(
                  isForm3Addon
                    ? `/admin/settings/industries/form-3/add-ons?industry=${encodeURIComponent(industry)}&industryId=${industryId ?? ""}${scopeQs}`
                    : `/admin/settings/industries/form-3/extras?industry=${encodeURIComponent(industry)}&industryId=${industryId ?? ""}${scopeQs}`,
                )
              }
            >
              Cancel
            </Button>
            {hasForm3Wizard && activeTab !== "details" ? (
              <Button variant="outline" onClick={goBackTab}>
                Back
              </Button>
            ) : null}
            <Button
              onClick={hasForm3Wizard ? goNextOrSave : save}
              disabled={saving}
              className="text-white"
              style={{ background: "linear-gradient(135deg, #00BCD4 0%, #00D4E8 100%)" }}
            >
              {saving
                ? "Saving..."
                : hasForm3Wizard
                  ? (hasForm3ExtraWizard && activeTab === "providers") ||
                    (hasForm3AddonWizard && activeTab === "dependencies")
                    ? editId
                      ? "Save"
                      : "Create"
                    : "Next"
                  : editId
                    ? "Save"
                    : "Create"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
